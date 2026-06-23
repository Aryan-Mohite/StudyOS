"""
mcq_service.py — Generate MCQ sets via Claude, validate against contract.
"""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

from services.llm import call_claude_json

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "mcq_generator.md"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


# ── Pydantic contract models ──────────────────────────────────────────────────

class MCQOptions(BaseModel):
    A: str
    B: str
    C: str
    D: str


class MCQQuestion(BaseModel):
    id: int
    question: str
    options: MCQOptions
    correct: Literal["A", "B", "C", "D"]
    explanation: str
    concept_tested: str

    @field_validator("question")
    @classmethod
    def question_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("question must not be empty")
        return v

    @field_validator("explanation")
    @classmethod
    def explanation_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("explanation must not be empty")
        return v


class MCQResponse(BaseModel):
    mcq_set_id: str
    topic_id: str
    topic: str
    subject: str
    difficulty: str
    generated_at: str
    questions: list[MCQQuestion]

    @field_validator("questions")
    @classmethod
    def at_least_one_question(cls, v: list[MCQQuestion]) -> list[MCQQuestion]:
        if len(v) < 1:
            raise ValueError("questions list must not be empty")
        return v


# ── Main service function ─────────────────────────────────────────────────────

def generate_mcq(
    topic_name: str,
    subject: str,
    topic_id: str,
    count: int = 10,
    difficulty: str = "mixed",
    syllabus_context: list[str] | None = None,
) -> dict:
    """
    Call Claude to generate an MCQ set for a topic.
    Validates against the MCQ contract via Pydantic.
    """
    context_str = ", ".join(syllabus_context) if syllabus_context else "None provided"

    user_prompt = f"""Generate {count} multiple-choice questions for the following topic.

Subject: {subject}
Topic: {topic_name}
Difficulty: {difficulty}
Syllabus context (other topics in this unit): {context_str}

The student is preparing for undergraduate engineering exams.
Return the JSON MCQ set object."""

    raw = call_claude_json(_load_prompt(), user_prompt, max_tokens=4096, retries=2)

    # Stamp server-controlled fields
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    raw["mcq_set_id"] = str(uuid.uuid4())
    raw["topic_id"] = topic_id
    raw["topic"] = topic_name
    raw["subject"] = subject
    raw["difficulty"] = difficulty
    raw["generated_at"] = now

    validated = MCQResponse.model_validate(raw)
    return validated.model_dump()
