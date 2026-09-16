# backend/app/core/config.py
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    database_url: str = Field(..., description="Database URL", alias="DATABASE_URL")
    supabase_url: str = Field(..., description="Supabase URL", alias="SUPABASE_URL")
    supabase_jwt_secret: str = Field(
        ..., description="Supabase JWT Secret", alias="SUPABASE_JWT_SECRET"
    )
    supabase_service_role_key: str = Field(
        default="",
        description="Supabase service role key",
        alias="SUPABASE_SERVICE_ROLE_KEY",
    )
    upstash_redis_url: str = Field(
        ...,
        description="Upstash Redis URL",
        validation_alias=AliasChoices("UPSTASH_REDIS_URL", "UPSTASH_REDIS_REST_URL"),
    )
    upstash_redis_token: str = Field(
        ...,
        description="Upstash Redis Token",
        validation_alias=AliasChoices("UPSTASH_REDIS_TOKEN", "UPSTASH_REDIS_REST_TOKEN"),
    )
    stripe_secret_key: str = Field(..., description="Stripe Secret Key", alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(
        ..., description="Stripe Webhook Secret", alias="STRIPE_WEBHOOK_SECRET"
    )
    frontend_url: str = Field(..., description="Frontend URL", alias="FRONTEND_URL")
    allowed_origins: list[str] = Field(
        default_factory=list,
        description="Allowed Origins",
        alias="ALLOWED_ORIGINS",
    )
    scheduler_secret: str = Field(..., description="Scheduler Secret", alias="SCHEDULER_SECRET")


settings = Settings()