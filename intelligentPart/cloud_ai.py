"""
cloud_ai.py — Gemini "Deep Scan" integration
Uploads the file to Gemini Files API, asks for structured metadata,
returns a dict: { ocr_text, summary, tags[] }

Gemini's VLM (Vision-Language Model) can handle PDFs, images, and docs.
It extracts text (OCR for images), generates a summary, and suggests tags.
Tags are specific labels like subject names, year levels, topics, exam seasons, etc.
This is used in DBpoller.py when processing new files with the "cloud" method.

"""

import os
import json
import re
from pathlib import Path

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))



_PROMPT = """
You are analysing an academic archive file (exam paper or photo).
Return ONLY a JSON object with these keys — no markdown, no extra text:
{
  "ocr_text":  "<full extracted text, empty string if not applicable>",
  "summary":   "<2-3 sentence summary of the content>",
  "tags":      ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
Tags should be specific: subject names, year levels, topics, exam seasons, etc.
"""

# MIME types Gemini Files API accepts
_MIME_MAP = {
    ".pdf":  "application/pdf",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif":  "image/gif",
    ".webp": "image/webp",
    ".tiff": "image/tiff",
    ".doc":  "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def get_cloud_metadata(file_path: str) -> dict:
    """
    Upload file to Gemini, extract text + tags, return structured dict.
    Raises on network or parse errors — caller handles and marks queue failed.
    """
    path = Path(file_path)
    mime = _MIME_MAP.get(path.suffix.lower(), "application/octet-stream")

    # Upload to Gemini Files API (handles files up to 2 GB)
    with open(path, "rb") as fh:
        uploaded = _client.files.upload(
            file=fh,
            config=types.UploadFileConfig(mime_type=mime, display_name=path.name),
        )

    try:
        response = _client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[uploaded, _PROMPT],
        )
        raw = response.text.strip()

        # Strip markdown code fences if Gemini wraps the JSON
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        result = json.loads(raw)

        return {
            "ocr_text": str(result.get("ocr_text", "")),
            "summary":  str(result.get("summary", "")),
            "tags":     list(result.get("tags", [])),
        }

    finally:
        # Clean up the uploaded file from Gemini's storage
        try:
            _client.files.delete(name=uploaded.name)
        except Exception:
            pass

# 
