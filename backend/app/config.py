import logging
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("eventscribe.config")


class Settings(BaseSettings):
    environment: str = "development"
    log_level: str = "INFO"
    frontend_origin: str = "http://localhost:3000"
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str | None = None
    gemini_api_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    max_reference_file_mb: int = 10
    max_photo_file_mb: int = 8
    max_photos_per_event: int = 20

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    warnings = []

    if not settings.supabase_url or not settings.supabase_anon_key:
        warnings.append("Supabase integration is not configured; authentication and persistence are disabled.")
    if not settings.gemini_api_key or not settings.gemini_model:
        warnings.append("Gemini integration is not configured; AI analysis and generation are disabled.")

    for warning in warnings:
        logger.warning(warning)

    return settings
