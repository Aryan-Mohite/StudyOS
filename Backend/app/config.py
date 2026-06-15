"""Central config — reads from .env via pydantic-settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # DB
    database_url: str = "mysql+pymysql://root:password@localhost:3306/studyos"

    # Vector DB
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333

    # AI
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""

    # Auth
    clerk_secret_key: str = ""

    # Storage
    r2_bucket: str = ""
    r2_access_key: str = ""
    r2_secret_key: str = ""
    r2_endpoint: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # App
    environment: str = "development"
    secret_key: str = "change-me"
    frontend_url: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
