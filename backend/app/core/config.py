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
    revalidate_secret: str = Field(
        default="",
        description="Shared secret for the frontend /api/revalidate webhook "
        "(used by internal.py after a sync; leave empty to skip revalidation)",
        alias="REVALIDATE_SECRET",
    )
    # NoDecode stops pydantic-settings from json.loads()-ing the raw env string,
    # so plain values like "http://localhost:3000" reach the validator below.
    allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=list,
        description="Allowed Origins",
        alias="ALLOWED_ORIGINS",
    )
    scheduler_secret: str = Field(..., description="Scheduler Secret", alias="SCHEDULER_SECRET")

    # Pool sizing is per worker process. Worst case = Cloud Run max-instances x WEB_CONCURRENCY
    # x (pool_size + max_overflow), so keep these small and point DATABASE_URL at Supabase's
    # transaction pooler (port 6543) to stay under its connection limits.
    db_pool_size: int = Field(default=3, description="SQLAlchemy DB pool size", alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=2, description="SQLAlchemy DB max overflow", alias="DB_MAX_OVERFLOW")
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


    # ── Perchie chatbot anthropic ──────────────────────────────────────
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

    # ── Paystack + CV template build packs ───────────────────
    # The same secret key also powers wallet card/bank deposits (KES) in api/routes/wallet.py,
    # so the Paystack account needs KES enabled alongside CV_PACK_CURRENCY.
    paystack_secret_key: str = Field(
        default="",
        description="Paystack secret key — used for checkout initialization and webhook "
        "signature (HMAC-SHA512) verification; empty disables CV pack purchases",
        alias="PAYSTACK_SECRET_KEY",
    )
    cv_pack_price_minor: int = Field(
        default=399,
        description="CV build pack price in minor units (399 = $3.99 / 3 builds)",
        alias="CV_PACK_PRICE_MINOR",
    )
    cv_pack_currency: str = Field(
        default="USD",
        description="CV build pack currency (must be enabled on the Paystack account)",
        alias="CV_PACK_CURRENCY",
    )

    # ── PayPal (wallet deposits, charged in USD) ─────────────
    # PayPal doesn't support KES, so wallet deposits are converted KES -> USD at
    # PAYPAL_KES_PER_USD and the wallet is credited the original KES amount.
    paypal_client_id: str = Field(default="", description="PayPal REST app client ID", alias="PAYPAL_CLIENT_ID")
    paypal_client_secret: str = Field(default="", description="PayPal REST app client secret", alias="PAYPAL_CLIENT_SECRET")
    paypal_webhook_id: str = Field(
        default="",
        description="PayPal webhook ID — required to verify webhook signatures",
        alias="PAYPAL_WEBHOOK_ID",
    )
    paypal_env: str = Field(default="sandbox", description="sandbox or live (production is accepted as live)", alias="PAYPAL_ENV")
    paypal_kes_per_usd: float = Field(
        default=129.0,
        gt=0,
        description="KES per 1 USD used to price PayPal wallet deposits — update when the rate moves",
        alias="PAYPAL_KES_PER_USD",
    )

    @field_validator("paypal_env", mode="before")
    @classmethod
    def normalize_paypal_env(cls, v):
        # Same vocabulary as MPESA_ENV: accept "production" as an alias for PayPal's "live",
        # and reject typos so a bad value can't silently fall back to the sandbox.
        env = str(v or "sandbox").strip().lower()
        if env == "production":
            env = "live"
        if env not in ("sandbox", "live"):
            raise ValueError("PAYPAL_ENV must be 'sandbox' or 'live'")
        return env

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