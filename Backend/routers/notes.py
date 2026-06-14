"""Notes generation for syllabus topics."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal

router = APIRouter()


class NotesRequest(BaseModel):
    topic_id: int
    note_type: Literal["long", "short", "revision"] = "long"


class NotesResponse(BaseModel):
    topic_id: int
    note_type: str
    content: str
    generated_at: str


@router.post("/generate", response_model=NotesResponse)
async def generate_notes(req: NotesRequest):
    """
    Trigger Notes Generation Agent (Agent 4).
    RAG pipeline: retrieve relevant book sections → LLM → structured notes.
    """
    # TODO: call NotesGenerationAgent with RAG
    from datetime import datetime

    return NotesResponse(
        topic_id=req.topic_id,
        note_type=req.note_type,
        content="[Notes will be generated here by the AI agent]",
        generated_at=datetime.utcnow().isoformat(),
    )


@router.get("/{topic_id}")
def get_notes(topic_id: int, note_type: str = "long"):
    """Fetch previously generated notes for a topic."""
    # TODO: fetch from MySQL
    return {"topic_id": topic_id, "note_type": note_type, "content": None}
