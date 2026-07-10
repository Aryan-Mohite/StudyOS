"""
config.py — Environment config for the AgenticService.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    port: int = 8000

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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
