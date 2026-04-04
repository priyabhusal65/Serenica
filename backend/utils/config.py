"""
utils/config.py
Centralised settings loaded from .env via pydantic-settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Groq
    GROQ_API_KEY: str

    # ML model paths
    TABULAR_MODEL_PATH: str = "models/tabular_model.joblib"
    TEXT_MODEL_PATH: str = "models/text_model.joblib"
    TFIDF_VECTORIZER_PATH: str = "models/tfidf_vectorizer.joblib"

    # App
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()