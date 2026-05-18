"""
classifier.py — Place/room classification for LAS

Room labels are user-driven: anyone can tag a PHOTO with "Room_label:Library".
The poller detects these tags and builds per-room CLIP embedding prototypes.
UI strips the prefix — "Room_label:Library" displays as "Library".

Strategy: prototype cosine-similarity when enough confirmed photos exist
(>= PROTOTYPE_MIN_SAMPLES), zero-shot CLIP text matching as fallback while bootstrapping.
"""

import os
import re
import numpy as np
from pathlib import Path
from dotenv import load_dotenv

from vision_engine import generate_clip_vector

load_dotenv()

PROTOTYPES_PATH       = Path(__file__).resolve().parent / "place_prototypes.npz"
PROTOTYPE_MIN_SAMPLES = int(os.getenv("PROTOTYPE_MIN_SAMPLES", "3"))

# Hardcoded zero-shot fallback — active only while no Room_label prototypes exist.
# Once users confirm enough photos per room, these text prompts are superseded.
PLACE_LABELS_FALLBACK: dict[str, str] = {
    "library":    "I place in a library with bookshelves, reading tables, window seats",
    "Musolla": "An islamic prayer room with carpets",
    "Computer Lab": "A computer lab with rows of desks and computers",
    "Lobby":     "Lobby or reception area with seating and a front desk",
    "Main_theater":   "a large school theater or auditorium with a stage and tiered seating",
    "canteen":     "a school canteen or cafeteria with lots of tables",
}


def _sanitise_key(label: str) -> str:
    """'Science Lab' → 'science_lab' (safe as numpy array key)."""
    return re.sub(r"[^a-z0-9]+", "_", label.strip().lower()).strip("_")


def load_place_prototypes() -> dict[str, np.ndarray]:
    if not PROTOTYPES_PATH.exists():
        return {}
    data = np.load(PROTOTYPES_PATH)
    return {k: data[k] for k in data.files}


def save_place_prototypes(prototypes: dict[str, np.ndarray]) -> None:
    np.savez_compressed(PROTOTYPES_PATH, **prototypes)


def update_place_prototypes(db, uploads_base: Path) -> None:
    """Rebuild place_prototypes.npz from Room_label:* tags on confirmed PHOTO files.

    Tag format:  Room_label:Library  →  key="library",  display="Library"
                 Room_label:Lab 2B   →  key="lab_2b",   display="Lab 2B"

    Rooms with fewer than PROTOTYPE_MIN_SAMPLES photos are skipped and fall back
    to zero-shot CLIP text matching during classify_place().
    """
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT t.TagContent, a.filePath
            FROM   tags t
            JOIN   filetags ft ON ft.TagID = t.TagID
            JOIN   archive  a  ON a.FileID = ft.FileID
            WHERE  t.TagContent LIKE 'Room\\_label:%%'
              AND  a.FileType = 'PHOTO'
        """)
        rows = cursor.fetchall()
    finally:
        cursor.close()

    if not rows:
        return

    groups: dict[str, list[Path]] = {}
    for row in rows:
        label = row["TagContent"].split(":", 1)[1].strip()
        key   = _sanitise_key(label)
        path  = uploads_base / row["filePath"].lstrip("/").lstrip("\\")
        groups.setdefault(key, []).append(path)

    prototypes: dict[str, np.ndarray] = {}
    for key, paths in groups.items():
        if len(paths) < PROTOTYPE_MIN_SAMPLES:
            print(f"  [Prototypes] {key}: {len(paths)}/{PROTOTYPE_MIN_SAMPLES} samples — skipped")
            continue
        vectors = [generate_clip_vector(p) for p in paths if p.exists()]
        if not vectors:
            continue
        mean_vec = np.mean(vectors, axis=0).astype(np.float32)
        norm = np.linalg.norm(mean_vec)
        prototypes[key] = mean_vec / (norm + 1e-8)
        print(f"  [Prototypes] {key}: built from {len(vectors)} photo(s)")

    if prototypes:
        save_place_prototypes(prototypes)
        print(f"  [Prototypes] Saved {len(prototypes)} room(s) → {PROTOTYPES_PATH.name}")


def classify_place(image_path: Path) -> list[tuple[str, float]]:
    """Returns [(room_key, confidence), ...] sorted descending.

    Uses learned prototypes from Room_label tags when available, falls back to
    zero-shot CLIP text matching from PLACE_LABELS_FALLBACK.
    """
    img_vec = np.array(generate_clip_vector(image_path), dtype=np.float32)
    norm    = np.linalg.norm(img_vec)

    prototypes = load_place_prototypes()
    if prototypes and norm > 1e-6: # 1e-6 is arbitrary threshold to avoid classifying near-zero vectors (e.g. CLIP fallback)
        results = [
            (key, float(np.dot(img_vec / norm, proto)))
            for key, proto in prototypes.items()
        ]
        return sorted(results, key=lambda x: -x[1])

    # Zero-shot fallback using CLIP text encoding
    try:
        import torch
        import open_clip
        from PIL import Image
        _model, _, _preprocess = open_clip.create_model_and_transforms(
            'ViT-B-32', pretrained='openai')
        _tokenizer = open_clip.get_tokenizer('ViT-B-32')
        _model.eval()
        image = _preprocess(Image.open(image_path)).unsqueeze(0)
        texts = _tokenizer(list(PLACE_LABELS_FALLBACK.values()))
        with torch.no_grad():
            img_feat = _model.encode_image(image)
            txt_feat = _model.encode_text(texts)
            img_feat /= img_feat.norm(dim=-1, keepdim=True)
            txt_feat /= txt_feat.norm(dim=-1, keepdim=True)
            scores = (img_feat @ txt_feat.T).softmax(dim=-1)[0].tolist()
        return sorted(zip(PLACE_LABELS_FALLBACK.keys(), scores), key=lambda x: -x[1])
    except ImportError:
        print(f"  [classify_place] 12 CLIP not installed — skipping place classification")
        return []