"""
llm_service.py — LangChain wrapper around the configured LLM provider.

Every agent/workflow in App/ talks to the model through this single
`get_llm()` / `call_llm()` choke point, via LangChain's standard chat model
interface. Which provider actually gets called (Groq, Gemini, or Anthropic)
is controlled entirely by `LLM_PROVIDER` in .env — no agent code needs to
change when you switch. No caching, no DB — pure model interaction.
"""

import json
import re
import time
from typing import Optional

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from config import settings

_llm_cache: dict[tuple, BaseChatModel] = {}


def _build_llm(max_tokens: int, temperature: float) -> BaseChatModel:
    provider = settings.llm_provider.lower()

    if provider == "groq":
        from langchain_groq import ChatGroq

        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is not set (LLM_PROVIDER=groq).")
        return ChatGroq(
            model=settings.groq_model_name,
            api_key=settings.groq_api_key,
            max_tokens=max_tokens,
            temperature=temperature,
        )

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not set (LLM_PROVIDER=gemini).")
        return ChatGoogleGenerativeAI(
            model=settings.gemini_model_name,
            google_api_key=settings.gemini_api_key,
            max_output_tokens=max_tokens,
            temperature=temperature,
        )

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set (LLM_PROVIDER=anthropic).")
        return ChatAnthropic(
            model=settings.anthropic_model_name,
            anthropic_api_key=settings.anthropic_api_key,
            max_tokens=max_tokens,
            temperature=temperature,
        )

    raise ValueError(
        f"Unknown LLM_PROVIDER '{settings.llm_provider}'. Use 'groq', 'gemini', or 'anthropic'."
    )


def get_llm(max_tokens: int = 4096, temperature: float = 0.0) -> BaseChatModel:
    """Return a cached chat model instance for the given provider/settings."""
    key = (settings.llm_provider, max_tokens, temperature)
    if key not in _llm_cache:
        _llm_cache[key] = _build_llm(max_tokens, temperature)
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
