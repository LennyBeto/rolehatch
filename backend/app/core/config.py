# backend/app/core/config.py
from pydantic import AliasChoices, Field, field_validator
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
    supabase_anon_key: str = Field(
        default="",
        description="Supabase anon/public API key — required for verifying tokens "
        "against the Supabase Auth API as a fallback to local JWT decode",
        alias="SUPABASE_ANON_KEY",
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

    frontend_url: str = Field(..., description="Frontend URL", alias="FRONTEND_URL")
    allowed_origins: list[str] = Field(
        default_factory=list,
        description="Allowed Origins",
        alias="ALLOWED_ORIGINS",
    )
    scheduler_secret: str = Field(..., description="Scheduler Secret", alias="SCHEDULER_SECRET")
    db_pool_size: int = Field(default=10, description="SQLAlchemy DB pool size", alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=20, description="SQLAlchemy DB max overflow", alias="DB_MAX_OVERFLOW")
    db_pool_timeout: int = Field(default=30, description="SQLAlchemy DB pool timeout", alias="DB_POOL_TIMEOUT")
    web_concurrency: int = Field(default=2, description="Uvicorn worker count", alias="WEB_CONCURRENCY")
    google_api_key: str = Field(
        default="",
        description="Google Generative AI API key — used for Gemini text embeddings "
        "in resume/job match scoring",
        alias="GOOGLE_API_KEY",
    )

    # ── M-Pesa (Safaricom Daraja API) ────────────────────────
    mpesa_consumer_key: str = Field(default="", description="Daraja Consumer Key", alias="MPESA_CONSUMER_KEY")
    mpesa_consumer_secret: str = Field(default="", description="Daraja Consumer Secret", alias="MPESA_CONSUMER_SECRET")
    mpesa_shortcode: str = Field(default="", description="Lipa Na M-Pesa Shortcode", alias="MPESA_SHORTCODE")
    mpesa_passkey: str = Field(default="", description="Lipa Na M-Pesa Passkey", alias="MPESA_PASSKEY")
    mpesa_env: str = Field(default="sandbox", description="sandbox or production", alias="MPESA_ENV")
    mpesa_callback_url: str = Field(default="", description="Daraja STK callback URL", alias="MPESA_CALLBACK_URL")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_allowed_origins(cls, v):
        # .env stores this as a plain comma-separated string, e.g.
        # ALLOWED_ORIGINS=https://rolehatch.com,https://www.rolehatch.com
        # — without this, Pydantic tries to JSON-decode it and raises on import.
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()