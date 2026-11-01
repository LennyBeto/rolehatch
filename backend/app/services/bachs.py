# backend/app/services/bachs.py
import hashlib
import hmac
import time
from decimal import ROUND_CEILING, Decimal

import httpx

from app.core.config import settings


class BachsError(Exception):
    pass


def _base_url() -> str:
    # Bachs keys select the environment: sk_live_ -> production, sk_sandbox_ -> sandbox.
    return "https://api.bachs.io" if settings.bachs_api_key.startswith("sk_live_") else "https://sandbox-api.bachs.io"


def kes_to_usd_amount(amount_kes: int) -> str:
    """Bachs money is a decimal string at currency precision ("12.50"), never minor units.
    Rounded up to the cent so we never under-collect."""
    rate = Decimal(str(settings.bachs_kes_per_usd))
    if rate <= 0:
        raise BachsError("Bachs exchange rate is not configured")
    cents = (Decimal(amount_kes) / rate * 100).to_integral_value(rounding=ROUND_CEILING)
    return f"{cents / 100:.2f}"


def create_checkout_session(
    *, usd_amount: str, reference: str, email: str | None,
    success_url: str, cancel_url: str, metadata: dict[str, str],
) -> dict:
    body: dict = {
        "pricing": {"currency": "USD", "amount": usd_amount},
        "reference": reference,  # unique per organization, max 128 chars
        "success_url": success_url,  # Bachs appends ?checkout_id=...
        "cancel_url": cancel_url,
        "metadata": metadata,
        "expires_in_minutes": 60,
    }
    if email:
        body["customer"] = {"email": email}
    try:
        resp = httpx.post(
            f"{_base_url()}/v1/checkout-sessions",
            headers={"Authorization": f"Bearer {settings.bachs_api_key}"},
            json=body,
            timeout=20,
        )
        data = resp.json()
    except (httpx.HTTPError, ValueError) as e:
        raise BachsError(str(e)) from e
    if resp.status_code not in (200, 201) or not data.get("checkout_id") or not data.get("checkout_url"):
        raise BachsError(f"Bachs create checkout failed ({resp.status_code}): {resp.text[:300]}")
    return data  # checkout_id, checkout_url, status, expires_at


def verify_signature(raw_body: bytes, headers, tolerance: int = 300) -> bool:
    """Bachs signs HMAC-SHA256("{timestamp}.{raw_body}"). X-Bachs-Signature-V2 carries
    "t=<ts>,v1=<sig>[,v1=<sig>...]" (one v1 per currently valid secret, so any match passes
    during a rotation); the legacy X-Bachs-Timestamp / X-Bachs-Signature pair is the fallback."""
    secret = settings.bachs_webhook_secret
    if not secret:
        return False

    v2 = headers.get("x-bachs-signature-v2")
    try:
        if v2:
            pairs = [p.split("=", 1) for p in v2.split(",") if "=" in p]
            timestamp = int(next(v for k, v in pairs if k == "t"))
            signatures = [v for k, v in pairs if k == "v1"]
        else:
            timestamp = int(headers.get("x-bachs-timestamp", ""))
            signatures = [headers.get("x-bachs-signature", "")]
    except (StopIteration, ValueError):
        return False

    if abs(time.time() - timestamp) > tolerance:
        return False  # too old; likely a replay
    expected = hmac.new(secret.encode(), f"{timestamp}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, s) for s in signatures)