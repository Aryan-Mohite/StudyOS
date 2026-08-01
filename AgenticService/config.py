"""
config.py — Environment config for the AgenticService.
"""

import sys

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    port: int = 8000
    env: str = "development"  # "development" | "production" — relaxes/tightens fail-fast checks below

    # ── LLM provider ──────────────────────────────────────────────────────
    # "groq" | "gemini" | "anthropic" — pick which model powers every agent.
    # Groq and Gemini both have generous free tiers, so they're the default
    # for dev. Anthropic is kept as an option if you want to switch back.
    llm_provider: str = "groq"

    # Only the key(s) for your chosen provider need to be set in .env.
    groq_api_key: str = ""
    gemini_api_key: str = ""
    anthropic_api_key: str = ""

    # Model names per provider (override in .env if you want a different one)
    groq_model_name: str = "llama-3.3-70b-versatile"
    gemini_model_name: str = "gemini-2.0-flash"
    anthropic_model_name: str = "claude-sonnet-4-6"

    # RAG config (replaces the old "Assets" folder — persistent vector store on disk)
    vector_db_dir: str = "vector_db"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ── Security ─────────────────────────────────────────────────────────
    # Shared secret for verifying the service-to-service JWT that Next.js
    # mints on every call (see App/core/security.py and
    # Frontend/src/lib/serviceAuth.ts). Must match on both sides exactly.
    internal_service_jwt_secret: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def _validate(self) -> "Settings":
        """
        Fail fast at startup rather than at the first request. A missing
        LLM key or JWT secret should surface immediately in the deploy logs,
        not as a 502/401 the first time a student tries to use the app.
        """
        provider_keys = {
            "groq": self.groq_api_key,
            "gemini": self.gemini_api_key,
            "anthropic": self.anthropic_api_key,
        }
        if self.llm_provider not in provider_keys:
            _fail(f"LLM_PROVIDER must be one of {list(provider_keys)}, got '{self.llm_provider}'.")
        if not provider_keys[self.llm_provider]:
            _fail(
                f"LLM_PROVIDER is '{self.llm_provider}' but its API key is not set "
                f"(expected {self.llm_provider.upper()}_API_KEY in .env)."
            )
        if self.env == "production" and not self.internal_service_jwt_secret:
            _fail("INTERNAL_SERVICE_JWT_SECRET must be set in production — refusing to start unauthenticated.")
        return self


def _fail(message: str) -> None:
    # Raised during Settings() construction, i.e. at import time — this
    # intentionally crashes the process on boot instead of limping along.
    print(f"[config] FATAL: {message}", file=sys.stderr)
    raise SystemExit(1)


settings = Settings()
