"""
notes_agent.py — Generate study notes via Claude, validate against contract.
Agent-level logic only; orchestration (retry/index-into-RAG) lives in
App/workflows/notes_workflow.py.
"""

import uuid
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, field_validator

from App.services.llm_service import call_llm_json

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "notes_generator.md"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


# ── Pydantic contract models ──────────────────────────────────────────────────

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


# ── Main agent function ───────────────────────────────────────────────────────

def generate_notes(
    topic_name: str,
    subject: str,
    unit_title: str,
    topic_id: str,
    syllabus_context: Optional[list[str]] = None,
    reference_context: Optional[list[str]] = None,
    student_context: Optional[str] = None,
) -> dict:
    """
    Call Claude to generate study notes for a topic.
    Validates against the Notes contract via Pydantic.
    Raises ValueError if output fails validation after retries.

    reference_context: optional excerpts retrieved from student-uploaded
    reference material (textbook/lecture PDFs) for this syllabus. When
    present, the model is asked to ground notes in these excerpts rather
    than relying solely on trained knowledge.

    student_context: optional one-line profile summary (e.g. "B.Tech 2nd
    Year, CS, SPPU") derived from the student's profile. Purely additive —
    when absent, prompt behaves exactly as before. Used to calibrate depth
    and framing, never to restrict content.
    """
    context_str = ", ".join(syllabus_context) if syllabus_context else "None provided"
    student_block = f"\nStudent profile: {student_context}" if student_context else ""

    reference_block = ""
    if reference_context:
        excerpts = "\n\n".join(f"[Excerpt {i+1}] {c}" for i, c in enumerate(reference_context))
        reference_block = f"""

The student has uploaded their own reference material for this syllabus.
Base these notes on these excerpts where relevant, in addition to your own
knowledge — prefer terminology, notation, and examples consistent with
this material over generic phrasing:

{excerpts}"""

    user_prompt = f"""Generate study notes for the following topic.

Subject: {subject}
Unit: {unit_title}
Topic: {topic_name}
Other topics in this unit (for context and related_topics): {context_str}
{student_block}
{reference_block}

The student is preparing for undergraduate engineering exams. Return the JSON notes object."""

    raw = call_llm_json(_load_prompt(), user_prompt, max_tokens=4096, retries=2)

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    raw["note_id"] = str(uuid.uuid4())
    raw["topic_id"] = topic_id
    raw["topic"] = topic_name
    raw["subject"] = subject
    raw["generated_at"] = now

    validated = NoteResponse.model_validate(raw)
    result = validated.model_dump()
    result["grounded_in_reference"] = bool(reference_context)
    return result


# ── Quality validation + repair (used by App/workflows/notes_workflow.py) ────
#
# AI RESPONSE IMPROVEMENT (see CHANGES-AI-QUALITY.md): notes generation used
# to be the only one of the three generation agents (mcq, notes, study_plan)
# without a quality-check/repair pass — Pydantic validation only confirms
# "this is well-formed JSON matching the contract," not "these are actually
# good notes." Mirrors the pattern already established in mcq_agent.py.

def validate_notes_quality(notes: dict) -> list[str]:
    """
    Structural/content quality checks the Pydantic contract doesn't cover.
    Returns a list of human-readable issues (empty = clean).
    """
    issues: list[str] = []
    sections = notes.get("sections", [])
    topic = (notes.get("topic") or "").strip().lower()

    # Duplicate section headings — the prompt asks for distinct facets
    # (definition, derivation, applications, ...); repeats mean the model
    # ran out of genuinely new content to cover.
    headings = [s.get("heading", "").strip().lower() for s in sections]
    headings = [h for h in headings if h]
    if len(headings) != len(set(headings)):
        dupes = {h for h in headings if headings.count(h) > 1}
        issues.append(f"duplicate section headings: {', '.join(sorted(dupes))}")

    # Thin sections — the prompt asks for "detailed explanation"; a section
    # under ~40 words is almost never that, regardless of topic.
    MIN_SECTION_WORDS = 40
    for s in sections:
        word_count = len(s.get("content", "").split())
        if word_count < MIN_SECTION_WORDS:
            issues.append(f"section '{s.get('heading')}' content is too thin ({word_count} words)")

    for s in sections:
        heading = s.get("heading", "").strip().lower()
        key_points = [k.strip() for k in s.get("key_points", []) if k.strip()]

        # Duplicate key_points within one section.
        lowered = [k.lower() for k in key_points]
        if len(lowered) != len(set(lowered)):
            issues.append(f"section '{s.get('heading')}' has duplicate key_points")

        # A key_point that's just the heading restated adds nothing —
        # the prompt explicitly asks for specific facts, not vague restatement.
        for kp in key_points:
            if heading and kp.strip().lower() == heading:
                issues.append(f"section '{s.get('heading')}' has a key_point identical to its own heading")

    # related_topics including the topic itself is a self-referencing link —
    # confusing in the UI, where these render as "learn this next" navigation.
    related = [r.strip().lower() for r in notes.get("related_topics", [])]
    if topic and topic in related:
        issues.append("related_topics includes the topic itself")

    # A summary under ~10 words can't cover "what it is, its key
    # rule/expression, and its significance" as the prompt requires — it's
    # not useful as the standalone revision card it's meant to be.
    summary_words = len(notes.get("summary", "").strip().split())
    if summary_words < 10:
        issues.append(f"summary is too short to serve as a revision card ({summary_words} words)")

    return issues


def repair_notes(notes: dict, issues: list[str], topic_name: str, subject: str) -> dict:
    """
    Send the flawed notes back to the model with the specific issues found,
    asking for a corrected full set (same contract). Re-validates via
    Pydantic before returning; raises ValueError if repair still fails
    the contract.
    """

    issue_list = "\n".join(f"- {issue}" for issue in issues)
    user_prompt = f"""You previously generated these study notes for topic "{topic_name}" ({subject}):

{json.dumps(notes, indent=2)}

Quality review found these problems:
{issue_list}

Fix ONLY the flagged problems (e.g. expand a thin section with real
technical content, replace a duplicate heading/key_point with genuinely
new material, rewrite a summary that's too short to stand alone as a
revision card, remove the topic itself from related_topics). Keep
everything else — section count, topic/subject fields — unchanged unless
directly required to fix a flagged issue. Return the full corrected JSON
notes object, same contract as before."""

    raw = call_llm_json(_load_prompt(), user_prompt, max_tokens=4096, retries=2)

    raw["note_id"] = notes["note_id"]
    raw["topic_id"] = notes["topic_id"]
    raw["topic"] = notes["topic"]
    raw["subject"] = notes["subject"]
    raw["generated_at"] = notes["generated_at"]

    validated = NoteResponse.model_validate(raw)
    result = validated.model_dump()
    result["grounded_in_reference"] = notes.get("grounded_in_reference", False)
    return result
