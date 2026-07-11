"""
numericals_agent.py — Generate solved numerical problem sets via Claude,
validate against contract.

NOTE: The uploaded snapshot did not include a working numericals backend
(only the frontend mock/view existed), so this agent is built fresh from
the Numericals contract in StudyOS_Roadmap.md + the Notes/MCQ pattern —
it is not a line-for-line port. Review the prompt and validation rules
closely before treating this as production-equivalent to Notes/MCQ.
"""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

from App.services.llm_service import call_llm_json

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "numericals_generator.md"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


# ── Pydantic contract models ──────────────────────────────────────────────────

class NumericalStep(BaseModel):
    step_number: int
    explanation: str
    expression: Optional[str] = None

    @field_validator("expression")
    @classmethod
    def empty_string_to_none(cls, v: Optional[str]) -> Optional[str]:
        return None if v == "" else v


class NumericalProblem(BaseModel):
    id: int
    question: str
    given: dict
    find: str
    steps: list[NumericalStep]
    answer: str
    unit: Optional[str] = None
    difficulty: Literal["easy", "medium", "hard"]
    concept_tested: str

    @field_validator("steps")
    @classmethod
    def at_least_one_step(cls, v: list[NumericalStep]) -> list[NumericalStep]:
        if len(v) < 1:
            raise ValueError("steps must have at least 1 item")
        return v

    @field_validator("answer")
    @classmethod
    def answer_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("answer must not be empty")
        return v

    @field_validator("find", "concept_tested")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("field must not be empty")
        return v


class NumericalSetResponse(BaseModel):
    numerical_set_id: str
    topic_id: str
    topic: str
    subject: str
    generated_at: str
    problems: list[NumericalProblem]

    @field_validator("problems")
    @classmethod
    def at_least_one_problem(cls, v: list[NumericalProblem]) -> list[NumericalProblem]:
        if len(v) < 1:
            raise ValueError("problems list must not be empty")
        return v


# ── Main agent function ───────────────────────────────────────────────────────

def generate_numericals(
    topic_name: str,
    subject: str,
    topic_id: str,
    count: int = 5,
    difficulty: str = "mixed",
    syllabus_context: Optional[list[str]] = None,
) -> dict:
    """
    Call Claude to generate a solved numericals set for a topic.
    Validates against the Numericals contract via Pydantic.
    """
    context_str = ", ".join(syllabus_context) if syllabus_context else "None provided"

    user_prompt = f"""Generate {count} solved numerical problems for the following topic.

Subject: {subject}
Topic: {topic_name}
Difficulty: {difficulty}
Syllabus context (other topics in this unit): {context_str}

The student is preparing for undergraduate engineering exams.
Return the JSON numericals set object."""

    raw = call_llm_json(_load_prompt(), user_prompt, max_tokens=4096, retries=2)

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    raw["numerical_set_id"] = str(uuid.uuid4())
    raw["topic_id"] = topic_id
    raw["topic"] = topic_name
    raw["subject"] = subject
    raw["generated_at"] = now

    validated = NumericalSetResponse.model_validate(raw)
    return validated.model_dump()


def run_numericals_generation(
    topic_name: str,
    subject: str,
    topic_id: str,
    count: int,
    difficulty: str,
    syllabus_context: list[str],
) -> dict:
    """Entry point used by main.py. Raises ValueError on failure.

    Previously wrapped in a single-node LangGraph StateGraph purely for
    architectural symmetry with the genuinely multi-step graphs (notes,
    tutor). There was no branching here, so that wrapper was removed —
    this function IS the generation step.
    """
    return generate_numericals(
        topic_name=topic_name,
        subject=subject,
        topic_id=topic_id,
        count=count,
        difficulty=difficulty,
        syllabus_context=syllabus_context,
    )
