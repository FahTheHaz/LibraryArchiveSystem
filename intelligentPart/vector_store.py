"""
vector_store.py — ChromaDB interface for LAS
Collection uses cosine distance to match CLIP's embedding space.
CLIP ViT-B/32 outputs 512-dim vectors — all adds must match this dimension.
"""

import chromadb
from chromadb.config import Settings
from pathlib import Path

_STORE_PATH = str(Path(__file__).resolve().parent / "las_vectors")

_client = chromadb.PersistentClient(
    path=_STORE_PATH,
    settings=Settings(anonymized_telemetry=False),
)

# cosine distance is required for L2-normalised CLIP vectors.
# Changing this after first use requires deleting the collection and starting over.
collection = _client.get_or_create_collection(
    name="las_files",
    metadata={"hnsw:space": "cosine"},
)


def add_to_vector_db(
    file_id: int,
    vector: list[float],
    text_snippet: str,
    metadata: dict | None = None,
) -> None:
    """Upsert a file's vector. Safe to call again after re-processing."""
    meta = {"file_id": file_id}
    if metadata:
        meta.update(metadata)
    collection.upsert(
        ids=[str(file_id)],
        embeddings=[vector],
        documents=[text_snippet],
        metadatas=[meta],
    )


def query_by_vector(query_vector: list[float], top_k: int = 10) -> dict:
    """Nearest-neighbour search using a pre-computed embedding."""
    return collection.query(
        query_embeddings=[query_vector],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )


def delete_from_vector_db(file_id: int) -> None:
    """Remove a file's vector when the file is deleted from archive."""
    collection.delete(ids=[str(file_id)])