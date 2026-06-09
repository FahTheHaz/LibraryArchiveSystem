"""
ocr_engine.py — Tesseract OCR for LAS
Extracts text from images and PDFs.

Requires:
  pip install pytesseract pdf2image pillow
  Tesseract binary: https://github.com/UB-Mannheim/tesseract/wiki
  Poppler (for PDFs): https://github.com/oschwartz10612/poppler-windows/releases
Falls back to empty string if not installed.
"""

from pathlib import Path
from typing import Union
# from PIL import Image
# from 


def run_ocr(file_path: Union[Path, str]) -> str:
    """Tesseract OCR — extracts text from images and PDFs."""
    file_path = Path(file_path)
    try:
        import pytesseract
        from pdf2image import convert_from_path
        pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        if file_path.suffix.lower() == '.pdf':
            pages = convert_from_path(str(file_path), poppler_path=r'C:\Program Files\poppler-26.02.0\Library\bin')
            return "\n".join(pytesseract.image_to_string(p) for p in pages)
        return pytesseract.image_to_string(str(file_path))
    except ImportError:
        return ""
    