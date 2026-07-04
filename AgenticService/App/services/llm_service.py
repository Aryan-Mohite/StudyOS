"""
llm_service.py — LangChain wrapper around Claude for the AgenticService.

Replaces the old raw `anthropic.Anthropic` client (services/llm.py) with
`langchain_anthropic.ChatAnthropic` so every agent/workflow in App/ talks
to the model through LangChain's standard interface. No caching, no DB —
pure model interaction, same contract as before.
"""

import json
import re
import time
from typing import Optional

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from config import settings

_llm_cache: dict[int, ChatAnthropic] = {}


def get_llm(max_tokens: int = 4096, temperature: float = 0.0) -> ChatAnthropic:
    """Return a cached ChatAnthropic instance for the given max_tokens."""
    key = hash((max_tokens, temperature))
    if key not in _llm_cache:
        _llm_cache[key] = ChatAnthropic(
            model=settings.model_name,
            anthropic_api_key=settings.anthropic_api_key,
            max_tokens=max_tokens,
            temperature=temperature,
        )
    return _llm_cache[key]


def call_llm(system: str, user: str, max_tokens: int = 4096) -> str:
    """Call Claude via LangChain and return raw text."""
    llm = get_llm(max_tokens=max_tokens)
    response = llm.invoke([SystemMessage(content=system), HumanMessage(content=user)])
    return response.content


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


def call_llm_json(
    system: str,
    user: str,
    max_tokens: int = 4096,
    retries: int = 2,
) -> dict:
    """
    Call Claude expecting JSON. Retries up to `retries` times on parse failure.
    Second+ attempts append a correction hint nudging the model back to raw JSON.
    """
    last_error: Optional[Exception] = None

    for attempt in range(retries + 1):
        prompt = user
        if attempt > 0:
            prompt = (
                user
                + "\n\nIMPORTANT: Your previous response could not be parsed as JSON. "
                "Return ONLY a raw JSON object — no fences, no prose, nothing else."
            )
        try:
            raw = call_llm(system, prompt, max_tokens)
            return extract_json(raw)
        except (ValueError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(1)

    raise ValueError(
        f"Model failed to return valid JSON after {retries + 1} attempts: {last_error}"
    )
