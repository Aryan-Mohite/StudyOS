"""
llm.py — Core Claude API helpers for the AgenticService.
No caching, no DB — pure model interaction.
"""

import json
import re
import time

import anthropic
from config import settings

_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
MODEL = "claude-sonnet-4-6"


def call_claude(system: str, user: str, max_tokens: int = 4096) -> str:
    """Call Claude and return raw text. Raises anthropic.APIError on failure."""
    msg = _client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return msg.content[0].text


def extract_json(text: str) -> dict:
    """
    Strip markdown fences or prose around a JSON object and parse it.
    Tries: direct parse → ```json fence → ``` fence → first { } block.
    """
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except json.JSONDecodeError:
            pass

    brace = re.search(r"\{[\s\S]*\}", text)
    if brace:
        try:
            return json.loads(brace.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(
        f"Could not extract valid JSON from model response. Preview: {text[:300]}"
    )


def call_claude_json(
    system: str,
    user: str,
    max_tokens: int = 4096,
    retries: int = 2,
) -> dict:
    """
    Call Claude expecting JSON. Retries up to `retries` times on parse failure.
    Second attempt appends a correction hint nudging the model back to raw JSON.
    """
    last_error: Exception | None = None

    for attempt in range(retries + 1):
        prompt = user
        if attempt > 0:
            prompt = (
                user
                + "\n\nIMPORTANT: Your previous response could not be parsed as JSON. "
                "Return ONLY a raw JSON object — no fences, no prose, nothing else."
            )
        try:
            raw = call_claude(system, prompt, max_tokens)
            return extract_json(raw)
        except (ValueError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(1)

    raise ValueError(
        f"Model failed to return valid JSON after {retries + 1} attempts: {last_error}"
    )
