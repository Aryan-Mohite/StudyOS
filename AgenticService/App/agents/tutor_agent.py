"""
tutor_agent.py — Single-turn tutor response generation, grounded in RAG
context pulled from the student's own generated notes. Conversation
memory and retrieval orchestration live in App/workflows/tutor_workflow.py
(this module is pure "given context + history, produce one answer").
"""

from pathlib import Path
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, field_validator

from App.services.llm_service import call_llm_json

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "tutor_chat.md"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


# ── Pydantic contract model ────────────────────────────────────────────────────

class TutorResponse(BaseModel):
    message_id: str
    answer: str
    confidence: Literal["high", "medium", "low"]
    sources_referenced: list[str]
    follow_up_suggestions: list[str]
    out_of_scope: bool

    @field_validator("answer")
    @classmethod
    def answer_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("answer must not be empty")
        return v


# ── Main agent function ───────────────────────────────────────────────────────

def generate_tutor_response(
    question: str,
    subject: str,
    topic_name: str,
    syllabus_context: list[str],
    retrieved_chunks: list[dict],
    chat_history: Optional[list[dict]] = None,
) -> dict:
    """
    Produce one tutor turn. `retrieved_chunks` comes from rag_service.retrieve_context.
    `chat_history` is a list of {role, content} dicts for short conversational memory.
    """
    context_str = ", ".join(syllabus_context) if syllabus_context else "None provided"

    if retrieved_chunks:
        notes_block = "\n\n".join(
            f"[{c['topic']}] {c['text']}" for c in retrieved_chunks
        )
    else:
        notes_block = "(no matching notes indexed yet for this topic)"

    history_block = ""
    if chat_history:
        history_block = "\n".join(
            f"{turn['role'].capitalize()}: {turn['content']}" for turn in chat_history[-6:]
        )

    user_prompt = f"""Subject: {subject}
Scoped topic: {topic_name}
Other syllabus topics: {context_str}

Retrieved notes context:
---
{notes_block}
---

Recent conversation:
{history_block or "(none — this is the first message)"}

Student's question: {question}

Return the JSON tutor response object."""

    raw = call_llm_json(_load_prompt(), user_prompt, max_tokens=2048, retries=2)
    raw["message_id"] = str(uuid.uuid4())
    validated = TutorResponse.model_validate(raw)
    return validated.model_dump()
