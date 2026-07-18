"""
syllabus_agent.py — the PDF Analysis Agent's model-facing logic: parses raw
syllabus text (already extracted from the PDF by App/services/pdf_service.py)
into the structured syllabus contract via Claude (through llm_service).

Agent-level logic only — pure LLM call + Pydantic-shaped dict in, dict out.
Orchestration (quality-check/repair loop) lives in
App/workflows/syllabus_workflow.py, same split as mcq_agent/mcq_workflow and
study_plan_agent/study_plan_workflow.
"""

import json
import re
import uuid
from pathlib import Path

from App.services.llm_service import call_llm_json

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "syllabus_parser.md"

# Generic placeholder-ish topic/unit names the model sometimes falls back to
# when it can't extract real structure — a strong signal the parse is weak
# even though it's structurally valid JSON. Bare words plus a pattern for
# "Unit 3" / "Topic 7" style numbered placeholders — a *unit's* title being
# just its own number is a real placeholder, but a *topic* legitimately
# named e.g. "Module 3: Convection" is not, so the numbered pattern only
# fires on an exact "unit N" / "topic N" match, not on names that merely
# contain a number.
_PLACEHOLDER_WORDS = {
    "misc", "miscellaneous", "other", "others", "n/a", "na", "unknown", "untitled",
}
_PLACEHOLDER_NUMBERED = re.compile(r"^(unit|topic|module)\s*\d*$", re.IGNORECASE)


def _is_placeholder(name: str) -> bool:
    normalized = name.strip().lower()
    return normalized in _PLACEHOLDER_WORDS or bool(_PLACEHOLDER_NUMBERED.match(normalized))


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


def _truncate(raw_text: str, limit: int = 8_000) -> str:
    truncated = raw_text[:limit]
    if len(raw_text) > limit:
        truncated += "\n\n[... text truncated for length ...]"
    return truncated


def parse_syllabus(raw_text: str, filename: str) -> dict:
    """
    Send raw PDF text to Claude → get back structured syllabus dict.
    Truncates to ~8,000 chars; injects UUIDs for any missing IDs.
    """
    user_prompt = (
        f"Parse this university syllabus into the required JSON structure.\n\n"
        f"Filename: {filename}\n\n"
        f"Raw syllabus text:\n---\n{_truncate(raw_text)}\n---"
    )

    parsed = call_llm_json(_load_prompt(), user_prompt, max_tokens=4096, retries=2)
    return _inject_ids(parsed)


# ── Quality validation + repair (used by App/workflows/syllabus_workflow.py) ──
#
# Same split as mcq_agent.py / study_plan_agent.py: the Pydantic-free dict
# shape here is "well-formed JSON matching the contract," not "actually
# captured the syllabus." These heuristics catch the failure mode that's
# specific to PDF Analysis — a technically valid but near-empty or
# placeholder-riddled structure, usually from a garbled OCR pass or a PDF
# whose layout confused the extractor.

def validate_syllabus_quality(parsed: dict) -> list[str]:
    """Structural/statistical quality checks. Returns human-readable issues
    (empty list = clean)."""
    issues: list[str] = []
    subjects = parsed.get("subjects") or []

    if not subjects:
        issues.append("no subjects extracted at all")
        return issues

    total_units = 0
    total_topics = 0
    placeholder_hits: list[str] = []
    empty_unit_subjects: list[str] = []

    for subject in subjects:
        subject_name = (subject.get("name") or "").strip()
        if not subject_name:
            issues.append("a subject is missing its name")
        elif _is_placeholder(subject_name):
            placeholder_hits.append(f"subject '{subject_name}'")

        units = subject.get("units") or []
        if not units:
            empty_unit_subjects.append(subject_name or "(unnamed subject)")
        total_units += len(units)

        for unit in units:
            topics = unit.get("topics") or []
            total_topics += len(topics)

            unit_title = (unit.get("title") or "").strip()
            if unit_title and _is_placeholder(unit_title):
                placeholder_hits.append(f"unit '{unit_title}'")

            seen_topic_names: list[str] = []
            for topic in topics:
                topic_name = (topic.get("name") or "").strip()
                if not topic_name:
                    issues.append(f"a topic in unit '{unit_title or unit.get('unit_number')}' has no name")
                    continue
                if _is_placeholder(topic_name):
                    placeholder_hits.append(f"topic '{topic_name}'")
                # Topic names should be concise labels per the prompt, not
                # full extracted sentences — a very long "name" usually means
                # the model dumped a raw line instead of distilling it.
                if len(topic_name) > 160:
                    issues.append(f"topic name looks like an unparsed raw line (>160 chars): '{topic_name[:60]}...'")
                seen_topic_names.append(topic_name.lower())

            if len(seen_topic_names) != len(set(seen_topic_names)):
                dupes = {n for n in seen_topic_names if seen_topic_names.count(n) > 1}
                issues.append(f"duplicate topic names within unit '{unit_title}': {', '.join(sorted(dupes))}")

    if empty_unit_subjects:
        issues.append(f"subjects with zero units: {', '.join(empty_unit_subjects)}")
    if total_units and total_topics == 0:
        issues.append("units were extracted but none contain any topics")
    if placeholder_hits:
        issues.append(f"placeholder-looking names found: {', '.join(placeholder_hits[:8])}")

    return issues


def repair_syllabus(parsed: dict, issues: list[str], raw_text: str, filename: str) -> dict:
    """
    Send the weak parse back to the model together with the raw source text
    and the specific issues found, asking for a corrected full structure.
    Re-injects IDs before returning; raises ValueError if the repair call
    itself fails.
    """
    issue_list = "\n".join(f"- {issue}" for issue in issues)
    user_prompt = f"""You previously parsed this syllabus (filename: {filename}) into this JSON structure:

{json.dumps(parsed, indent=2)}

Quality review found these problems:
{issue_list}

Re-parse the ORIGINAL raw text below more carefully to fix the flagged
problems (e.g. dig out topics inside units that came back empty, replace
placeholder names like "Topic 1" with the actual topic names present in the
text, distill any raw dumped lines into concise topic names, remove
duplicate topic names within a unit). Do not fabricate content that isn't
in the source text — if something genuinely isn't present, it's fine to
leave that section sparse. Return the full corrected JSON object, same
contract as before.

Raw syllabus text:
---
{_truncate(raw_text)}
---"""

    raw = call_llm_json(_load_prompt(), user_prompt, max_tokens=4096, retries=2)

    # Preserve the original syllabus_id — repair is a correction pass on the
    # same document, not a new upload.
    raw["syllabus_id"] = parsed.get("syllabus_id") or raw.get("syllabus_id")
    return _inject_ids(raw)


def run_syllabus_parse(raw_text: str, filename: str) -> dict:
    """Direct, no-quality-loop entry point — kept for callers (tests,
    scripts) that want the raw single-shot parse without the workflow's
    validate/repair pass. main.py calls the PDF Analysis Agent's workflow
    entry point instead: App/workflows/syllabus_workflow.py's
    run_pdf_analysis, see that module's docstring for why."""
    return parse_syllabus(raw_text, filename)