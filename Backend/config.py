from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    db_path: str = "studyos.db"
    max_pdf_size_mb: int = 10
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
