"""
StudyOS — Qdrant vector store initialisation.

Creates two collections:
  - book_chunks   : embeddings for uploaded textbook sections
  - notes_chunks  : embeddings for generated notes (for retrieval)
  - pyq_chunks    : embeddings for previous year question papers

Run once:  python qdrant_setup.py
"""
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
import os

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))

# Embedding dimension: 1536 (OpenAI text-embedding-3-small)
# or 768 (Google textembedding-gecko). Adjust to match your chosen model.
EMBED_DIM = 1536

COLLECTIONS = [
    "book_chunks",
    "notes_chunks",
    "pyq_chunks",
]


def main():
    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    existing = {c.name for c in client.get_collections().collections}

    for name in COLLECTIONS:
        if name in existing:
            print(f"  [skip] {name} already exists")
            continue
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
        )
        print(f"  [ok]   created collection: {name}")

    print("\nQdrant setup complete.")


if __name__ == "__main__":
    main()
