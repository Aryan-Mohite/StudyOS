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
    gemini_model_name: str = "gemini-3.6-flash"
    anthropic_model_name: str = "claude-sonnet-4-6"

    # RAG config (replaces the old "Assets" folder — persistent vector store)
    # Leave QDRANT_URL unset for local dev — rag_service.py falls back to an
    # embedded on-disk Qdrant instance at QDRANT_LOCAL_PATH (zero setup, but
    # ephemeral if the host's disk is ephemeral, e.g. Render free tier). Set
    # QDRANT_URL + QDRANT_API_KEY (Qdrant Cloud free tier, or any self-hosted
    # Qdrant) for storage that survives backend restarts/redeploys.
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_local_path: str = "vector_db"
    # Embeddings run via the Gemini API (not locally) to avoid the torch/
    # sentence-transformers memory footprint that OOMs on Render's free
    # 512MB tier — see rag_service.py's module docstring. This means
    # gemini_api_key below is required for RAG even when LLM_PROVIDER is
    # "groq" or "anthropic".
    embedding_model: str = "gemini-embedding-001"

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
        if not self.gemini_api_key:
            # Not a hard fail: reference-material RAG is an optional feature
            # (notes/MCQ generation work fine without it), so a missing key
            # shouldn't block the whole service from starting. But it will
            # make every RAG call fail at request time, so surface it loudly
            # now rather than as a mystery 500 the first time a student
            # uploads a reference PDF.
            print(
                "[config] WARNING: GEMINI_API_KEY is not set. Reference-material "
                "RAG (embeddings) requires it regardless of LLM_PROVIDER — "
                "notes/MCQ generation will still work, but reference uploads "
                "and grounded generation will fail until it's set. Get a free "
                "key (no credit card) at https://aistudio.google.com/apikey.",
                file=sys.stderr,
            )
        if self.env == "production" and not self.qdrant_url:
            # Deliberately a warning, not _fail(): local-path Qdrant still
            # works, it just won't survive a restart on ephemeral-disk hosts.
            # That's a real but non-fatal footgun, so it's logged loudly
            # instead of blocking startup (e.g. someone deploying to a host
            # WITH persistent disk legitimately doesn't need Qdrant Cloud).
            print(
                "[config] WARNING: ENV=production but QDRANT_URL is not set — "
                "reference-material RAG data will be stored at QDRANT_LOCAL_PATH "
                "and will NOT survive a restart on hosts with ephemeral disk "
                "(e.g. Render's free tier). Set QDRANT_URL/QDRANT_API_KEY "
                "(Qdrant Cloud free tier) if that matters for your deployment.",
                file=sys.stderr,
            )
        return self


def _fail(message: str) -> None:
    # Raised during Settings() construction, i.e. at import time — this
    # intentionally crashes the process on boot instead of limping along.
    print(f"[config] FATAL: {message}", file=sys.stderr)
    raise SystemExit(1)


settings = Settings()

print(f"[config] embedding_model = {settings.embedding_model}", file=sys.stderr)