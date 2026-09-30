from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Flowdesk AI Service"
    app_version: str = "0.1.0"
    environment: str = "development"
    django_api_url: str = "http://localhost:8000"
    gemini_api_key: str | None = None
    gemini_model: str = "gemma-4-26b-a4b-it"
    gemini_embedding_model: str = "gemini-embedding-001"
    gemini_timeout: float = 20

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
