"""Create Qdrant collections. Run once: python qdrant_setup.py"""
import os
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
EMBED_DIM   = 1536   # text-embedding-3-small

COLLECTIONS = ["book_chunks", "notes_chunks", "pyq_chunks"]


def main():
    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    existing = {c.name for c in client.get_collections().collections}
    for name in COLLECTIONS:
        if name in existing:
            print(f"  skip  {name}")
            continue
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
        )
        print(f"  ok    {name} created")
    print("\nQdrant ready.")


if __name__ == "__main__":
    main()
