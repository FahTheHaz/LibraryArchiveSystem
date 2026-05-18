"""
DBpoller.py — LAS AI Processing Worker
Polls ProcessingQueue for pending files, delegates to specialist modules,
then pushes results to ChromaDB and MySQL.

Run from inside intelligentPart/:
    python DBpoller.py
"""

import os
import time
from pathlib import Path

from dotenv import load_dotenv

from connection import get_db
from vector_store import add_to_vector_db
from ocr_engine import run_ocr
from vision_engine import generate_clip_vector, run_face_recognition
from classifier import classify_place, update_place_prototypes
from cloud_ai import get_cloud_metadata

load_dotenv()

UPLOADS_BASE               = Path(__file__).resolve().parent.parent / "backend"
POLL_INTERVAL              = int(os.getenv("POLL_INTERVAL_SECONDS", "10"))
PROTOTYPE_REFRESH_INTERVAL = int(os.getenv("PROTOTYPE_REFRESH_INTERVAL", "50"))
PLACE_CONF_THRESHOLD       = float(os.getenv("PLACE_CONF_THRESHOLD", "0.50"))


# ─── Process one queue item ────────────────────────────────────────────────────

def process_item(db, queue_id: int, file_id: int, file_path: str,
                 file_type: str, target_method: str) -> None:

    abs_path = UPLOADS_BASE / file_path.lstrip("/").lstrip("\\")
    cursor   = db.cursor()

    try:
        ocr_text = ""
        summary  = ""
        tags: list[tuple[str, str, float]] = []  # (content, source, confidence)
        vector: list[float] | None = None

        if target_method == "cloud":
            result   = get_cloud_metadata(str(abs_path))
            ocr_text = result.get("ocr_text", "")
            summary  = result.get("summary", "")
            raw_tags = result.get("tags", [])
            tags     = [(t, "cloud_vlm", 0.90) for t in raw_tags if t]
            vector   = generate_clip_vector(abs_path)
        else:
            ocr_text = run_ocr(abs_path)
            vector   = generate_clip_vector(abs_path)

        # Push to ChromaDB
        text_snippet = ocr_text[:2000] if ocr_text else f"file_id:{file_id}"
        add_to_vector_db(
            file_id=file_id,
            vector=vector,
            text_snippet=text_snippet,
            metadata={"file_type": file_type, "file_path": file_path},
        )

        # Upsert FileAIContent
        cursor.execute("""
            INSERT INTO FileAIContent (FileID, OCRText, Summary, ProcessingMethod)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                OCRText          = VALUES(OCRText),
                Summary          = VALUES(Summary),
                ProcessingMethod = VALUES(ProcessingMethod)
        """, (file_id, ocr_text or None, summary or None, target_method))

        # Insert AI-generated tags
        for tag_content, source, confidence in tags:
            tag_content = tag_content.strip()[:100]
            if not tag_content:
                continue
            cursor.execute(
                "SELECT TagID FROM tags WHERE LOWER(TagContent) = LOWER(%s)",
                (tag_content,)
            )
            row = cursor.fetchone()
            if row:
                tag_id = row[0]
                cursor.execute(
                    "UPDATE tags SET Source = %s, ConfidenceScore = %s WHERE TagID = %s",
                    (source, confidence, tag_id)
                )
            else:
                cursor.execute(
                    "INSERT INTO tags (TagContent, Helpfulness, Source, ConfidenceScore) "
                    "VALUES (%s, 0, %s, %s)",
                    (tag_content, source, confidence)
                )
                tag_id = cursor.lastrowid
            cursor.execute(
                "INSERT IGNORE INTO filetags (FileID, TagID) VALUES (%s, %s)",
                (file_id, tag_id)
            )

        # PHOTO-only: face recognition + place classification
        if file_type == "PHOTO" and abs_path.suffix.lower() in {
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".tiff"
        }:
            faces = run_face_recognition(abs_path)
            if faces:
                print(f"  [Faces] FileID {file_id}: {len(faces)} face(s)")

            place_results = classify_place(abs_path)
            if place_results:
                top_key, top_conf = place_results[0]
                if top_conf >= PLACE_CONF_THRESHOLD:
                    display_label = top_key.replace("_", " ").title()
                    cursor.execute("""
                        INSERT INTO FilePlaces (FileID, PlaceKey, PlaceLabel, Confidence)
                        VALUES (%s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            PlaceLabel = VALUES(PlaceLabel),
                            Confidence = VALUES(Confidence)
                    """, (file_id, top_key, display_label, round(top_conf, 3)))
                    print(f"  [Place] FileID {file_id} → {display_label} ({top_conf:.2f})")

        # Mark completed
        cursor.execute(
            "UPDATE ProcessingQueue SET Status = 'completed' WHERE QueueID = %s",
            (queue_id,)
        )
        db.commit()
        print(f"  [OK] FileID {file_id} → completed ({target_method})")

    except Exception as exc:
        db.rollback()
        cursor.execute(
            "UPDATE ProcessingQueue SET Status = 'failed', ErrorMessage = %s "
            "WHERE QueueID = %s",
            (str(exc)[:500], queue_id)
        )
        db.commit()
        print(f"  [FAIL] FileID {file_id}: {exc}")

    finally:
        cursor.close()


# ─── Poll one batch ────────────────────────────────────────────────────────────

def poll_once() -> bool:
    """Claim and process one pending item. Returns True if work was found."""
    db     = get_db()
    cursor = db.cursor(dictionary=True)

    try:
        # Note: FOR UPDATE SKIP LOCKED requires MySQL 8+; MariaDB uses FOR UPDATE.
        cursor.execute("""
            SELECT pq.QueueID, pq.FileID, pq.TargetMethod,
                   a.filePath, a.FileType
            FROM   ProcessingQueue pq
            JOIN   archive a ON pq.FileID = a.FileID
            WHERE  pq.Status = 'pending'
            LIMIT  1
            FOR UPDATE
        """)
        row = cursor.fetchone()

        if not row:
            cursor.close()
            db.close()
            return False

        cursor.execute(
            "UPDATE ProcessingQueue SET Status = 'processing' WHERE QueueID = %s",
            (row["QueueID"],)
        )
        db.commit()
        cursor.close()

        print(f"\n[POLL] Picked up QueueID={row['QueueID']} "
              f"FileID={row['FileID']} method={row['TargetMethod']}")

        process_item(
            db=db,
            queue_id=row["QueueID"],
            file_id=row["FileID"],
            file_path=row["filePath"],
            file_type=row["FileType"],
            target_method=row["TargetMethod"],
        )
        return True

    except Exception as exc:
        print(f"[POLL ERROR] {exc}")
        return False

    finally:
        db.close()


# ─── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"LAS AI Processor started (polling every {POLL_INTERVAL}s)")
    print(f"Uploads root: {UPLOADS_BASE}\n")

    poll_count = 0
    while True:
        try:
            found = poll_once()
            poll_count += 1

            if poll_count % PROTOTYPE_REFRESH_INTERVAL == 0:
                print("\n[Prototypes] Refreshing from Room_label tags...")
                db = get_db()
                try:
                    update_place_prototypes(db, UPLOADS_BASE)
                finally:
                    db.close()

            if not found:
                time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            print("\nStopped by user.")
            break
        except Exception as exc:
            print(f"[UNHANDLED] {exc}")
            time.sleep(POLL_INTERVAL)


