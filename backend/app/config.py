from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://kol_admin:changeme@db:5432/kol_platform"
    redis_url: str = "redis://redis:6379/0"
    secret_key: str = "changeme_in_production"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"


settings = Settings()
