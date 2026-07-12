"""
numericals_agent.py — Generate solved numerical problem sets via Claude,
validate against contract.

NOTE: The uploaded snapshot did not include a working numericals backend
(only the frontend mock/view existed), so this agent is built fresh from
the Numericals contract in StudyOS_Roadmap.md + the Notes/MCQ pattern —
it is not a line-for-line port. Review the prompt and validation rules
closely before treating this as production-equivalent to Notes/MCQ.

Agent-level logic only; orchestration (arithmetic sanity-check/repair loop)
lives in App/workflows/numericals_workflow.py.
"""

import json
import re
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


# ── Quality validation + repair (used by App/workflows/numericals_workflow.py) ─

_PLACEHOLDER_ANSWER_RE = re.compile(r"^\s*(n/?a|tbd|see above|unknown|-+)\s*$", re.IGNORECASE)


def validate_numericals_quality(problem_set: dict, requested_difficulty: str) -> list[str]:
    """
    Structural quality checks beyond the Pydantic contract. NOTE: this does
    NOT re-derive the arithmetic (no sympy/CAS in this service — see
    requirements.txt "lean infrastructure" note) — it catches the failure
    modes an LLM actually produces: empty `given`, placeholder answers,
    single-step "solutions" that skip the derivation the prompt asks for.
    """
    issues: list[str] = []
    problems = problem_set.get("problems", [])

    for p in problems:
        pid = p.get("id")
        if not p.get("given"):
            issues.append(f"problem id {pid}: 'given' is empty despite a numeric problem")
        if _PLACEHOLDER_ANSWER_RE.match(p.get("answer", "")):
            issues.append(f"problem id {pid}: answer is a placeholder ('{p.get('answer')}')")
        if len(p.get("steps", [])) < 2 and p.get("difficulty") != "easy":
            issues.append(
                f"problem id {pid}: only {len(p.get('steps', []))} step(s) for a "
                f"'{p.get('difficulty')}' problem — derivation looks skipped"
            )

    concepts = [p.get("concept_tested", "").strip().lower() for p in problems]
    concepts = [c for c in concepts if c]
    if len(concepts) != len(set(concepts)):
        dupes = {c for c in concepts if concepts.count(c) > 1}
        issues.append(f"duplicate concept_tested values: {', '.join(sorted(dupes))}")

    if requested_difficulty == "mixed" and len(problems) >= 5:
        levels = {p.get("difficulty") for p in problems}
        if len(levels) < 2:
            issues.append(
                f"difficulty mode is 'mixed' but all {len(problems)} problems are '{levels}'"
            )

    return issues


def repair_numericals(
    problem_set: dict, issues: list[str], topic_name: str, subject: str
) -> dict:
    """
    Send the flawed set back to the model with the specific issues found,
    asking for a corrected full set (same contract). Re-validates via
    Pydantic before returning; raises ValueError if repair still fails
    the contract.
    """
    issue_list = "\n".join(f"- {issue}" for issue in issues)
    user_prompt = f"""You previously generated this solved-numericals set for topic "{topic_name}" ({subject}):

{json.dumps(problem_set, indent=2)}

Quality review found these problems:
{issue_list}

Fix ONLY the flagged problems (e.g. fill in a missing `given`, replace a
placeholder answer with the actual computed result, add the missing
derivation steps, re-verify arithmetic). Keep everything else — problem
count, ids, topic/subject fields — unchanged. Return the full corrected
JSON numericals set object, same contract as before."""

    raw = call_llm_json(_load_prompt(), user_prompt, max_tokens=4096, retries=2)

    raw["numerical_set_id"] = problem_set["numerical_set_id"]
    raw["topic_id"] = problem_set["topic_id"]
    raw["topic"] = problem_set["topic"]
    raw["subject"] = problem_set["subject"]
    raw["generated_at"] = problem_set["generated_at"]

    validated = NumericalSetResponse.model_validate(raw)
    return validated.model_dump()
