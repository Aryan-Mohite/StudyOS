"""
study_plan_agent.py — Generate a day-by-day study schedule via the LLM,
validate against contract. Agent-level logic only; orchestration
(quality-check/repair loop) lives in App/workflows/study_plan_workflow.py.
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

from App.services.llm_service import call_llm_json

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "study_plan_generator.md"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


# ── Pydantic contract models ──────────────────────────────────────────────────

class PlanTopic(BaseModel):
    topic_id: str
    topic_name: str
    subject: str


class PlanDay(BaseModel):
    day_number: int
    session_type: Literal["learn", "revision", "mock_test", "rest"]
    topics: list[PlanTopic] = []
    focus_note: str = ""


class StudyPlanResponse(BaseModel):
    study_plan_id: str
    syllabus_id: str
    exam_date: str
    generated_at: str
    total_days: int
    days: list[PlanDay]

    @field_validator("days")
    @classmethod
    def at_least_one_day(cls, v: list[PlanDay]) -> list[PlanDay]:
        if len(v) < 1:
            raise ValueError("days list must not be empty")
        return v


# ── Flattening helper ───────────────────────────────────────────────────────

def flatten_syllabus_topics(syllabus: dict) -> list[dict]:
    """Flattens the parsed syllabus contract into a flat topic list for the
    study-plan prompt: [{topic_id, topic_name, subject, has_numericals,
    difficulty_hint}, ...]."""
    flat: list[dict] = []
    for subject in syllabus.get("subjects", []):
        subject_name = subject.get("name", "Unknown Subject")
        for unit in subject.get("units", []):
            for topic in unit.get("topics", []):
                flat.append({
                    "topic_id": topic.get("topic_id") or str(uuid.uuid4()),
                    "topic_name": topic.get("name", "Untitled topic"),
                    "subject": subject_name,
                    "has_numericals": bool(topic.get("has_numericals", False)),
                    "difficulty_hint": topic.get("difficulty_hint") or "medium",
                })
    return flat


# ── Main agent function ───────────────────────────────────────────────────────

def generate_study_plan(
    syllabus_id: str,
    exam_date: str,
    days_available: int,
    topics: list[dict],
) -> dict:
    """
    Call the LLM to generate a day-by-day study plan.
    Validates against the StudyPlanResponse contract via Pydantic.
    """
    topics_str = json.dumps(topics, indent=2)

    user_prompt = f"""Create a {days_available}-day study plan.

Exam date: {exam_date}
Days available (including today, inclusive of exam-eve): {days_available}
Total topics to cover: {len(topics)}

Topic list (cover every one exactly once on a "learn" day):
{topics_str}

Return the JSON study plan object with exactly {days_available} entries in "days",
day_number running 1 to {days_available}."""

    raw = call_llm_json(_load_prompt(), user_prompt, max_tokens=8192, retries=2)

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    raw["study_plan_id"] = str(uuid.uuid4())
    raw["syllabus_id"] = syllabus_id
    raw["exam_date"] = exam_date
    raw["generated_at"] = now
    raw["total_days"] = days_available

    validated = StudyPlanResponse.model_validate(raw)
    return validated.model_dump()


# ── Quality validation + repair (used by App/workflows/study_plan_workflow.py)

def validate_study_plan_quality(
    plan: dict, expected_topic_ids: list[str], days_available: int
) -> list[str]:
    """
    Structural/coverage quality checks the Pydantic contract doesn't cover:
    contract validity says "this is a well-formed plan," not "this plan
    actually covers the syllabus correctly." Returns a list of
    human-readable issues (empty = clean).
    """
    issues: list[str] = []
    days = plan.get("days", [])

    # Day-number sequence must be contiguous 1..days_available.
    day_numbers = sorted(d.get("day_number") for d in days)
    expected_numbers = list(range(1, days_available + 1))
    if day_numbers != expected_numbers:
        issues.append(
            f"day_number sequence is {day_numbers}, expected contiguous 1..{days_available}"
        )

    # Every topic must appear exactly once across all "learn" days.
    scheduled_ids: list[str] = []
    for d in days:
        if d.get("session_type") == "learn":
            for t in d.get("topics", []):
                scheduled_ids.append(t.get("topic_id"))

    expected_set = set(expected_topic_ids)
    scheduled_set = set(scheduled_ids)

    missing = expected_set - scheduled_set
    if missing:
        issues.append(f"{len(missing)} topic(s) never scheduled: {sorted(missing)[:5]}")

    duplicates = {tid for tid in scheduled_ids if scheduled_ids.count(tid) > 1}
    if duplicates:
        issues.append(f"topic(s) scheduled more than once: {sorted(duplicates)[:5]}")

    extra = scheduled_set - expected_set
    if extra:
        issues.append(f"{len(extra)} topic(s) scheduled that were not in the input list")

    # At least one revision day near the end, for plans of reasonable length.
    if days_available >= 4:
        revision_days = [d for d in days if d.get("session_type") == "revision"]
        if not revision_days:
            issues.append("no 'revision' day present despite 4+ days being available")

    return issues


def repair_study_plan(
    plan: dict, issues: list[str], expected_topics: list[dict], days_available: int
) -> dict:
    """
    Send the flawed plan back to the model with the specific issues found,
    asking for a corrected full plan (same contract). Re-validates via
    Pydantic before returning; raises ValueError if repair still fails
    the contract.
    """
    issue_list = "\n".join(f"- {issue}" for issue in issues)
    topics_str = json.dumps(expected_topics, indent=2)

    user_prompt = f"""You previously generated this {days_available}-day study plan:

{json.dumps(plan, indent=2)}

Quality review found these problems:
{issue_list}

The full topic list that must be covered exactly once across "learn" days:
{topics_str}

Fix ONLY the flagged problems (e.g. reschedule a missing topic, remove a
duplicate, renumber days to be contiguous, add a revision day near the end).
Keep the overall structure — {days_available} total days — unchanged. Return
the full corrected JSON study plan object, same contract as before."""

    raw = call_llm_json(_load_prompt(), user_prompt, max_tokens=8192, retries=2)

    raw["study_plan_id"] = plan["study_plan_id"]
    raw["syllabus_id"] = plan["syllabus_id"]
    raw["exam_date"] = plan["exam_date"]
    raw["generated_at"] = plan["generated_at"]
    raw["total_days"] = days_available

    validated = StudyPlanResponse.model_validate(raw)
    return validated.model_dump()
