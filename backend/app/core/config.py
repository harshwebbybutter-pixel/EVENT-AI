import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# config.py is at backend/app/core/config.py
# .env is at backend/.env
# So we need to go 3 levels up: core -> app -> backend
env_path = Path(__file__).parent.parent.parent / ".env"

class Settings(BaseSettings):
    # App
    APP_BASE_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    SECRET_KEY: str = "ad3f03bdf9c9923a24a2b4ab4d5a3785e52768c2a99907880aed418829fb0c95"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    CORS_ORIGINS: str = '["http://localhost:3000"]'

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5432/evenuefy"

    # LLM (Groq)
    LLM_BASE_URL: str = "https://api.groq.com/openai/v1"
    LLM_MODEL_NAME: str = "llama-3.3-70b-versatile"
    GROQ_API_KEY: str = ""

    # Mistral OCR - https://console.mistral.ai
    MISTRAL_API_KEY: str = ""

    # Storage
    STORAGE_PATH: str = "./uploads"

    model_config = SettingsConfigDict(
        env_file=str(env_path),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
