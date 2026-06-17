import json
import re
import time
import anthropic
from config import settings

_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

MODEL = "claude-sonnet-4-6"


def call_claude(system: str, user: str, max_tokens: int = 4096) -> str:
    """
    Call Claude and return the raw text response.
    Raises anthropic.APIError on failure.
    """
    message = _client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return message.content[0].text


def extract_json(text: str) -> dict:
    """
    Strip any markdown fences or prose that surrounds a JSON object,
    then parse and return it.

    Tries in order:
    1. Direct parse (model returned clean JSON)
    2. Extract from ```json ... ``` fences
    3. Extract from ``` ... ``` fences
    4. Find the first { ... } block spanning the whole response
    """
    text = text.strip()

    # 1. Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2 & 3. Strip fences
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # 4. First complete JSON object
    brace_match = re.search(r"\{[\s\S]*\}", text)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract valid JSON from model response. Preview: {text[:300]}")


def call_claude_json(
    system: str,
    user: str,
    max_tokens: int = 4096,
    retries: int = 2,
) -> dict:
    """
    Call Claude expecting a JSON response. Retries on malformed JSON.
    On second retry appends a correction hint to the user message.
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
        except (ValueError, json.JSONDecodeError) as e:
            last_error = e
            if attempt < retries:
                time.sleep(1)  # brief back-off before retry

    raise ValueError(f"Model failed to return valid JSON after {retries + 1} attempts: {last_error}")
