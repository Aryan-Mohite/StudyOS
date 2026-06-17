import io
import uuid
from pathlib import Path

import pdfplumber
from fastapi import UploadFile

from services.llm import call_claude_json

_SYSTEM_PROMPT = Path(__file__).parent.parent / "prompts" / "syllabus_parser.md"


def _load_prompt() -> str:
    return _SYSTEM_PROMPT.read_text(encoding="utf-8")


async def extract_pdf_text(file: UploadFile) -> str:
    """Read uploaded file bytes and extract all text with pdfplumber."""
    contents = await file.read()
    text_pages: list[str] = []

    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text and page_text.strip():
                text_pages.append(page_text)

    return "\n\n".join(text_pages)


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
    Send raw PDF text to Claude and get back a structured syllabus dict.
    Injects UUIDs for any missing IDs.
    """
    # Truncate to ~8 000 chars to stay well inside context limits.
    # Most syllabi are 2–4 pages; this covers up to ~15 pages of dense text.
    truncated = raw_text[:8_000]
    if len(raw_text) > 8_000:
        truncated += "\n\n[... text truncated for length ...]"

    user_prompt = (
        f"Parse this university syllabus into the required JSON structure.\n\n"
        f"Filename: {filename}\n\n"
        f"Raw syllabus text:\n---\n{truncated}\n---"
    )

    parsed = call_claude_json(_load_prompt(), user_prompt, max_tokens=4096)
    return _inject_ids(parsed)
