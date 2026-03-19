import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

env_path = Path(__file__).parent.parent / ".env"

class Settings(BaseSettings):
    # App
    APP_BASE_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    CORS_ORIGINS: str = '["http://localhost:3000"]'

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5432/evenuefy"

    # LLM (Groq) — key must be set in .env file, never hardcoded here
    LLM_BASE_URL: str = "https://api.groq.com/openai/v1"
    LLM_MODEL_NAME: str = "llama-3.3-70b-versatile"
    GROQ_API_KEY: str = ""

    # Storage
    STORAGE_PATH: str = "./uploads"

    model_config = SettingsConfigDict(
        env_file=env_path,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
