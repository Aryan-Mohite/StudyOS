import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, field_validator

from services.llm import call_claude_json

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "notes_generator.md"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


# ── Pydantic models that mirror the Phase 0 contract ────────────────────────

class NoteSection(BaseModel):
    heading: str
    content: str
    key_points: list[str]
    formula: Optional[str] = None

    @field_validator("key_points")
    @classmethod
    def at_least_two_points(cls, v: list[str]) -> list[str]:
        if len(v) < 2:
            raise ValueError("key_points must have at least 2 items")
        return v

    @field_validator("formula")
    @classmethod
    def empty_string_to_none(cls, v: Optional[str]) -> Optional[str]:
        return None if v == "" else v


class NoteResponse(BaseModel):
    note_id: str
    topic_id: str
    topic: str
    subject: str
    generated_at: str
    sections: list[NoteSection]
    summary: str
    related_topics: list[str]

    @field_validator("sections")
    @classmethod
    def at_least_two_sections(cls, v: list[NoteSection]) -> list[NoteSection]:
        if len(v) < 2:
            raise ValueError("sections must have at least 2 items")
        return v


# ── Main service function ────────────────────────────────────────────────────

def generate_notes(
    topic_name: str,
    subject: str,
    unit_title: str,
    topic_id: str,
    syllabus_context: list[str] | None = None,
) -> dict:
    """
    Call Claude to generate study notes for a topic, validate the response
    against the Notes contract, and return a clean dict ready for storage.

    Raises ValueError if the model's output fails validation after retries.
    """
    context_str = ", ".join(syllabus_context) if syllabus_context else "None provided"

    user_prompt = f"""Generate study notes for the following topic.

Subject: {subject}
Unit: {unit_title}
Topic: {topic_name}
Other topics in this unit (for context and related_topics): {context_str}

The student is preparing for undergraduate engineering exams. Return the JSON notes object."""

    raw = call_claude_json(_load_prompt(), user_prompt, max_tokens=4096, retries=2)

    # Stamp server-controlled fields before validation
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    raw["note_id"] = str(uuid.uuid4())
    raw["topic_id"] = topic_id
    raw["topic"] = topic_name       # enforce — don't trust LLM to copy exactly
    raw["subject"] = subject
    raw["generated_at"] = now

    # Validate against contract
    validated = NoteResponse.model_validate(raw)
    return validated.model_dump()
