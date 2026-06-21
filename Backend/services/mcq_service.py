import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, field_validator, model_validator

from services.llm import call_claude_json

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "mcq_generator.md"

Difficulty = Literal["easy", "medium", "hard"]
DifficultyMode = Literal["easy", "medium", "hard", "mixed"]
OptionKey = Literal["A", "B", "C", "D"]


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


# ── Pydantic models that mirror the Phase 0 contract ────────────────────────

class MCQQuestion(BaseModel):
    id: int
    question: str
    options: dict[str, str]
    correct: OptionKey
    explanation: str
    concept_tested: str
    difficulty: Difficulty

    @field_validator("options")
    @classmethod
    def exactly_four_options(cls, v: dict[str, str]) -> dict[str, str]:
        if set(v.keys()) != {"A", "B", "C", "D"}:
            raise ValueError(f"options must have exactly keys A, B, C, D — got {sorted(v.keys())}")
        if any(not val.strip() for val in v.values()):
            raise ValueError("no option may be empty")
        return v


class MCQResponse(BaseModel):
    mcq_set_id: str
    topic_id: str
    topic: str
    subject: str
    generated_at: str
    total_questions: int
    questions: list[MCQQuestion]

    @model_validator(mode="after")
    def questions_match_total(self) -> "MCQResponse":
        if len(self.questions) != self.total_questions:
            raise ValueError(
                f"total_questions ({self.total_questions}) does not match "
                f"questions array length ({len(self.questions)})"
            )
        return self


# ── Main service function ────────────────────────────────────────────────────

def generate_mcq(
    topic_name: str,
    subject: str,
    topic_id: str,
    count: int = 10,
    difficulty: DifficultyMode = "mixed",
    syllabus_context: list[str] | None = None,
) -> dict:
    """
    Call Claude to generate an MCQ set for a topic, validate the response
    against the MCQ contract, and return a clean dict ready for storage.

    Raises ValueError if the model's output fails validation after retries.
    """
    count = max(1, min(count, 20))  # enforce contract bound: default 10, max 20
    context_str = ", ".join(syllabus_context) if syllabus_context else "None provided"

    user_prompt = f"""Generate {count} multiple-choice questions for the following topic.

Subject: {subject}
Topic: {topic_name}
Other topics in this unit (for context — do not generate questions about these): {context_str}
Difficulty mode: {difficulty}

The student is preparing for undergraduate engineering exams. Return the JSON MCQ object."""

    raw = call_claude_json(_load_prompt(), user_prompt, max_tokens=4096, retries=2)

    # Stamp server-controlled fields before validation
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    raw["mcq_set_id"] = str(uuid.uuid4())
    raw["topic_id"] = topic_id
    raw["topic"] = topic_name        # enforce — don't trust LLM to copy exactly
    raw["subject"] = subject
    raw["generated_at"] = now
    if "total_questions" not in raw or not raw["total_questions"]:
        raw["total_questions"] = len(raw.get("questions", []))

    # Re-number questions 1..N in case the model skipped/duplicated ids
    for i, q in enumerate(raw.get("questions", []), start=1):
        q["id"] = i

    # Validate against contract
    validated = MCQResponse.model_validate(raw)
    return validated.model_dump()
