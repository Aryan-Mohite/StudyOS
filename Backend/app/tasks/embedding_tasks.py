"""Background embedding + Qdrant upsert tasks."""
from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.embedding_tasks.embed_chunk")
def embed_chunk(text: str, metadata: dict, collection: str) -> str:
    """
    Embed a single text chunk and upsert into Qdrant.
    Runs async logic in a sync Celery task via asyncio.run().
    """
    import asyncio
    from app.services.embeddings import upsert_chunk
    from app.database import get_qdrant

    client = get_qdrant()
    point_id = asyncio.run(upsert_chunk(client, collection, text, metadata))
    return point_id


@celery_app.task(name="app.tasks.embedding_tasks.embed_notes")
def embed_notes(note_id: int, content: str, topic_id: int, syllabus_id: int) -> str:
    """Embed generated notes and store in notes_chunks collection."""
    import asyncio
    from app.services.embeddings import upsert_chunk
    from app.database import get_qdrant

    client = get_qdrant()
    return asyncio.run(
        upsert_chunk(
            client, "notes_chunks", content,
            {"note_id": note_id, "topic_id": topic_id, "syllabus_id": syllabus_id},
        )
    )
