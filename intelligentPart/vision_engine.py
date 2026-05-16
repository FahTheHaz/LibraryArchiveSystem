"""
vision_engine.py — CLIP image embeddings and DeepFace recognition for LAS

CLIP requires:  pip install open-clip-torch torch torchvision pillow
  Falls back to a zero vector (512-dim) if not installed.
  For PDFs: convert page 0 to an image with pdf2image before calling.

DeepFace requires:  pip install deepface
  Downloads Facenet512 weights (~100 MB) on first run.
  Falls back to [] if not installed.

"""

from pathlib import Path


def generate_clip_vector(file_path: Path) -> list[float]:
    """CLIP ViT-B/32 — 512-dim L2-normalised image vector."""
    try:
        import torch
        import open_clip
        from PIL import Image
        model, _, preprocess = open_clip.create_model_and_transforms(
            'ViT-B-32', pretrained='openai')
        model.eval()
        image = preprocess(Image.open(file_path)).unsqueeze(0)
        with torch.no_grad():
            vector = model.encode_image(image)
            vector = vector / vector.norm(dim=-1, keepdim=True)
            return vector.squeeze().tolist()
    except ImportError:
        print(f"  [CLIP not installed] {file_path.name} → zero vector (512-dim)")
        return [0.0] * 512


def run_face_recognition(file_path: Path) -> list[dict]:
    """DeepFace Facenet512 — returns one dict per detected face.
    Each dict: {"embedding": [512 floats], "facial_area": {"x":.., "y":.., "w":.., "h":..}}
    """
    try:
        from deepface import DeepFace
        return DeepFace.represent(
            img_path=str(file_path),
            model_name="Facenet512",
            detector_backend="opencv",
            enforce_detection=False,
        )
    except ImportError:
        print(f"  [DeepFace not installed] {file_path.name} → no faces")
        return []