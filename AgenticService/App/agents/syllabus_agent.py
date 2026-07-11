"""
syllabus_agent.py — Parses raw syllabus text into the structured syllabus
contract via Claude (through llm_service). Also exposes run_syllabus_parse,
the entry point called directly by main.py (no LangGraph wrapper — see
App/workflows/README.md for why).
"""

import uuid
from pathlib import Path

from App.services.llm_service import call_llm_json

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "syllabus_parser.md"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _inject_ids(parsed: dict) -> dict:
    """Ensure every subject and topic has a stable UUID."""
    if not parsed.get("syllabus_id"):
        parsed["syllabus_id"] = str(uuid.uuid4())

    for subject in parsed.get("subjects", []):
        if not subject.get("subject_id"):
            subject["subject_id"] = str(uuid.uuid4())
        for unit in subject.get("units", []):
            for topic in unit.get("topics", []):
                if not topic.get("topic_id"):
                    topic["topic_id"] = str(uuid.uuid4())

    return parsed


def parse_syllabus(raw_text: str, filename: str) -> dict:
    """
    Send raw PDF text to Claude → get back structured syllabus dict.
    Truncates to ~8,000 chars; injects UUIDs for any missing IDs.
    """
    truncated = raw_text[:8_000]
    if len(raw_text) > 8_000:
        truncated += "\n\n[... text truncated for length ...]"

    user_prompt = (
        f"Parse this university syllabus into the required JSON structure.\n\n"
        f"Filename: {filename}\n\n"
        f"Raw syllabus text:\n---\n{truncated}\n---"
    )

    parsed = call_llm_json(_load_prompt(), user_prompt, max_tokens=4096)
    return _inject_ids(parsed)


def run_syllabus_parse(raw_text: str, filename: str) -> dict:
    """Entry point used by main.py. Raises ValueError on failure.

    Previously wrapped in a single-node LangGraph StateGraph purely for
    architectural symmetry with the genuinely multi-step graphs (notes,
    tutor). There was no branching here, so that wrapper was removed —
    this function IS the parse step.
    """
    return parse_syllabus(raw_text, filename)
