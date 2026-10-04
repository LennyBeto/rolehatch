# backend/app/core/config.py
import json
from typing import Annotated

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


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
    # NoDecode stops pydantic-settings from json.loads()-ing the raw env string,
    # so plain values like "http://localhost:3000" reach the validator below.
    allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=list,
        description="Allowed Origins",
        alias="ALLOWED_ORIGINS",
    )
    scheduler_secret: str = Field(..., description="Scheduler Secret", alias="SCHEDULER_SECRET")
    db_pool_size: int = Field(default=10, description="SQLAlchemy DB pool size", alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=20, description="SQLAlchemy DB max overflow", alias="DB_MAX_OVERFLOW")
    db_pool_timeout: int = Field(default=30, description="SQLAlchemy DB pool timeout", alias="DB_POOL_TIMEOUT")
    web_concurrency: int = Field(default=2, description="Uvicorn worker count", alias="WEB_CONCURRENCY")

    # ── Perchie chatbot ──────────────────────────────────────
    # Active provider: Google AI Studio (Gemini)
    gemini_api_key: str = Field(
        default="",
        description="Google AI Studio API key for Perchie",
        validation_alias=AliasChoices("GEMINI_API_KEY", "GOOGLE_API_KEY"),
    )
    chat_model: str = Field(
        default="gemini-3.8-flash",
        description="Gemini model used by Perchie",
        alias="CHAT_MODEL",
    )

    # Previous provider: Anthropic — kept for future use. To switch back, uncomment these,
    # restore the Anthropic call in services/chatbot.py, and set CHAT_MODEL to a Claude model.
    # anthropic_api_key: str = Field(default="", description="Anthropic API key for Perchie", alias="ANTHROPIC_API_KEY")
    # chat_model: str = Field(default="claude-haiku-4-5-20251001", description="Model used by Perchie", alias="CHAT_MODEL")

    google_api_key: str = Field(
        default="",
        description="Google Generative AI API key — used for Gemini text embeddings "
        "in resume/job match scoring",
        alias="GOOGLE_API_KEY",
    )

    # ── M-Pesa (Safaricom Daraja API) ────────────────────────
    mpesa_consumer_key: str = Field(default="", description="Daraja Consumer Key", alias="MPESA_CONSUMER_KEY")
    mpesa_consumer_secret: str = Field(default="", description="Daraja Consumer Secret", alias="MPESA_CONSUMER_SECRET")
    mpesa_shortcode: str = Field(default="", description="Lipa Na M-Pesa / B2C Shortcode", alias="MPESA_SHORTCODE")
    mpesa_passkey: str = Field(default="", description="Lipa Na M-Pesa Passkey", alias="MPESA_PASSKEY")
    mpesa_env: str = Field(default="sandbox", description="sandbox or production", alias="MPESA_ENV")
    mpesa_callback_url: str = Field(default="", description="Daraja STK callback URL", alias="MPESA_CALLBACK_URL")
    mpesa_result_url: str = Field(default="", description="Daraja B2C result URL", alias="MPESA_RESULT_URL")
    mpesa_timeout_url: str = Field(default="", description="Daraja B2C queue-timeout URL", alias="MPESA_TIMEOUT_URL")
    mpesa_initiator_name: str = Field(default="", description="B2C API initiator username", alias="MPESA_INITIATOR_NAME")
    mpesa_security_credential: str = Field(
        default="",
        description="Initiator password RSA-encrypted with Safaricom's cert, base64",
        alias="MPESA_SECURITY_CREDENTIAL",
    )
    mpesa_callback_secret: str = Field(
        default="",
        description="Random token appended to callback URLs (Daraja callbacks are unsigned)",
        alias="MPESA_CALLBACK_SECRET",
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_allowed_origins(cls, v):
        # Accepts "a,b", '["a","b"]', or empty. Trailing slashes are stripped because
        # CORS origins must not end in "/" or the browser rejects the response.
        if v is None:
            return []
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("["):
                try:
                    v = json.loads(v)
                except ValueError:
                    v = v.strip("[]").replace('"', "").replace("'", "").split(",")
                return [str(o).strip().rstrip("/") for o in v if str(o).strip()]
            return [o.strip().rstrip("/") for o in v.split(",") if o.strip()]
        return v


settings = Settings()