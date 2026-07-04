"""
config.py — Environment config for the AgenticService.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    anthropic_api_key: str
    port: int = 8000

    # LangChain / model config
    model_name: str = "claude-sonnet-4-6"

    # RAG config (replaces the old "Assets" folder — persistent vector store on disk)
    vector_db_dir: str = "vector_db"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
