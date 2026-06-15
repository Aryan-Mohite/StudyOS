"""Notes generation — async via Celery, cached in Redis."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, get_qdrant
from app.schemas.notes import NotesRequest, NotesResponse
from app.services.cache import cache_get, cache_set
from app.services.embeddings import retrieve
from app.services.llm_router import call_llm, Task
from datetime import datetime

router = APIRouter()


@router.post("/generate", response_model=NotesResponse)
async def generate_notes(req: NotesRequest, db: AsyncSession = Depends(get_db)):
    cache_key = f"notes:{req.topic_id}:{req.note_type}"
    cached = await cache_get(cache_key)
    if cached:
        return NotesResponse(**cached)

    # TODO: fetch topic + syllabus_id from DB
    syllabus_id = 1
    topic_name  = "Sample Topic"

    qdrant = get_qdrant()
    context_chunks = await retrieve(qdrant, "book_chunks", topic_name, syllabus_id)
    context = "\n\n".join(context_chunks)

    prompt = f"""Generate {req.note_type} study notes for: {topic_name}

Textbook context:
{context}

Format clearly with headings, key points, and examples."""

    content, _ = await call_llm(Task.notes_generation, prompt)

    result = NotesResponse(
        topic_id=req.topic_id,
        note_type=req.note_type,
        content=content,
        generated_at=datetime.utcnow(),
    )
    await cache_set(cache_key, result.model_dump(mode="json"), ttl=86400)
    return result
