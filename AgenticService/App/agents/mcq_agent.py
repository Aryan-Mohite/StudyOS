"""
mcq_agent.py — Generate MCQ sets via Claude, validate against contract.
Agent-level logic only; orchestration (quality-check/repair loop) lives in
App/workflows/mcq_workflow.py.
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

from App.services.llm_service import call_llm_json

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
    difficulty: Literal["easy", "medium", "hard"]

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
    generated_at: str
    total_questions: int
    questions: list[MCQQuestion]

    @field_validator("questions")
    @classmethod
    def at_least_one_question(cls, v: list[MCQQuestion]) -> list[MCQQuestion]:
        if len(v) < 1:
            raise ValueError("questions list must not be empty")
        return v


# ── Main agent function ───────────────────────────────────────────────────────

def generate_mcq(
    topic_name: str,
    subject: str,
    topic_id: str,
    count: int = 10,
    difficulty: str = "mixed",
    syllabus_context: Optional[list[str]] = None,
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

    raw = call_llm_json(_load_prompt(), user_prompt, max_tokens=4096, retries=2)

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    raw["mcq_set_id"] = str(uuid.uuid4())
    raw["topic_id"] = topic_id
    raw["topic"] = topic_name
    raw["subject"] = subject
    raw["generated_at"] = now
    raw["total_questions"] = len(raw.get("questions", []))

    validated = MCQResponse.model_validate(raw)
    return validated.model_dump()


# ── Quality validation + repair (used by App/workflows/mcq_workflow.py) ──────

def validate_mcq_quality(mcq_set: dict, requested_difficulty: str) -> list[str]:
    """
    Structural/statistical quality checks the Pydantic contract doesn't cover:
    contract validity says "this is a well-formed MCQ set," not "this is a
    *good* one." Returns a list of human-readable issues (empty = clean).
    """
    issues: list[str] = []
    questions = mcq_set.get("questions", [])

    # Duplicate concept coverage — the prompt explicitly asks for no repeats.
    concepts = [q.get("concept_tested", "").strip().lower() for q in questions]
    concepts = [c for c in concepts if c]
    if len(concepts) != len(set(concepts)):
        dupes = {c for c in concepts if concepts.count(c) > 1}
        issues.append(f"duplicate concept_tested values: {', '.join(sorted(dupes))}")

    # Difficulty distribution — only meaningful when the caller asked for a mix.
    if requested_difficulty == "mixed" and len(questions) >= 5:
        levels = {q.get("difficulty") for q in questions}
        if len(levels) < 2:
            issues.append(
                f"difficulty mode is 'mixed' but all {len(questions)} questions are '{levels}'"
            )

    # Every question needs a real explanation referencing the reasoning,
    # not just a restatement — cheap heuristic: explanation shouldn't be
    # near-identical to the question stem.
    for q in questions:
        stem = q.get("question", "").strip().lower()
        expl = q.get("explanation", "").strip().lower()
        if stem and expl and stem == expl:
            issues.append(f"question id {q.get('id')} explanation just repeats the stem")

    return issues


def repair_mcq(mcq_set: dict, issues: list[str], topic_name: str, subject: str) -> dict:
    """
    Send the flawed set back to the model with the specific issues found,
    asking for a corrected full set (same contract). Re-validates via
    Pydantic before returning; raises ValueError if repair still fails
    the contract.
    """
    issue_list = "\n".join(f"- {issue}" for issue in issues)
    user_prompt = f"""You previously generated this MCQ set for topic "{topic_name}" ({subject}):

{json.dumps(mcq_set, indent=2)}

Quality review found these problems:
{issue_list}

Fix ONLY the flagged problems (e.g. replace a duplicate concept_tested with a
genuinely different concept, rebalance difficulty, rewrite an explanation that
just restates the question). Keep everything else — question count, ids,
topic/subject fields — unchanged. Return the full corrected JSON MCQ set
object, same contract as before."""

    raw = call_llm_json(_load_prompt(), user_prompt, max_tokens=4096, retries=2)

    # Preserve identity fields from the original set rather than trusting
    # the repair pass to echo them back correctly.
    raw["mcq_set_id"] = mcq_set["mcq_set_id"]
    raw["topic_id"] = mcq_set["topic_id"]
    raw["topic"] = mcq_set["topic"]
    raw["subject"] = mcq_set["subject"]
    raw["generated_at"] = mcq_set["generated_at"]
    raw["total_questions"] = len(raw.get("questions", []))

    validated = MCQResponse.model_validate(raw)
    return validated.model_dump()
