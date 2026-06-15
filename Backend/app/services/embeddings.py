"""Qdrant RAG helpers — embed text, upsert, and retrieve."""
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue
from openai import AsyncOpenAI
from app.config import get_settings
import uuid

cfg = get_settings()
openai_client = AsyncOpenAI(api_key=cfg.openai_api_key)

COLLECTIONS = {
    "books":  "book_chunks",
    "notes":  "notes_chunks",
    "pyqs":   "pyq_chunks",
}
EMBED_MODEL = "text-embedding-3-small"
EMBED_DIM   = 1536


async def embed(text: str) -> list[float]:
    res = await openai_client.embeddings.create(model=EMBED_MODEL, input=text)
    return res.data[0].embedding


async def upsert_chunk(
    client: QdrantClient,
    collection: str,
    text: str,
    metadata: dict,
) -> str:
    vector   = await embed(text)
    point_id = str(uuid.uuid4())
    client.upsert(
        collection_name=collection,
        points=[PointStruct(id=point_id, vector=vector, payload={**metadata, "text": text})],
    )
    return point_id


async def retrieve(
    client: QdrantClient,
    collection: str,
    query: str,
    syllabus_id: int,
    top_k: int = 5,
) -> list[str]:
    vector = await embed(query)
    results = client.search(
        collection_name=collection,
        query_vector=vector,
        query_filter=Filter(
            must=[FieldCondition(key="syllabus_id", match=MatchValue(value=syllabus_id))]
        ),
        limit=top_k,
    )
    return [r.payload.get("text", "") for r in results]
