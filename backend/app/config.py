import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://kol_admin:changeme@localhost:5432/kol_platform"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Ingestion API keys (all optional)
    NCBI_API_KEY: str = ""
    OPENALEX_EMAIL: str = ""
    UNPAYWALL_EMAIL: str = ""
    OPEN_PAYMENTS_APP_TOKEN: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


def get_settings() -> Settings:
    # Try loading from multiple .env locations
    for env_path in ["/app/.env", ".env", "../.env"]:
        if os.path.exists(env_path):
            os.environ.setdefault("ENV_FILE", env_path)
            break
    return Settings()


settings = get_settings()
