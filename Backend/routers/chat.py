"""AI Tutor chat endpoint — scoped to the student's syllabus."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class Message(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    syllabus_id: int
    messages: List[Message]
    topic_id: Optional[int] = None


class ChatResponse(BaseModel):
    reply: str
    sources: List[str] = []


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    AI Tutor endpoint.
    Retrieves relevant chunks from Qdrant (scoped to syllabus_id),
    then calls the LLM with context.
    """
    # TODO: Qdrant retrieval → LLM generation (RAG pipeline)
    return ChatResponse(
        reply="[AI tutor response scoped to your syllabus will appear here]",
        sources=[],
    )
