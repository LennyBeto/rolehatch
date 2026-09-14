# backend/app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    supabase_url: str
    supabase_jwt_secret: str
    upstash_redis_url: str
    upstash_redis_token: str
    stripe_secret_key: str
    stripe_webhook_secret: str
    frontend_url: str
    allowed_origins: list[str] = ["https://rolehatch.com"]

    class Config:
        env_file = ".env"

settings = Settings()