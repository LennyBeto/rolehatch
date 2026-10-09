# backend/app/services/paystack.py
import hashlib
import hmac

import httpx

from app.core.config import settings

BASE_URL = "https://api.paystack.co"


class PaystackError(Exception):
    pass


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.paystack_secret_key}"}


def initialize_transaction(*, email: str, amount_kes: int, reference: str, callback_url: str, user_id: str) -> dict:
    """amount_kes is whole KES; Paystack expects the smallest unit (x100)."""
    try:
        resp = httpx.post(
            f"{BASE_URL}/transaction/initialize",
            headers=_headers(),
            json={
                "email": email,
                "amount": amount_kes * 100,
                "currency": "KES",
                "reference": reference,
                "callback_url": callback_url,
                "metadata": {"user_id": user_id},
            },
            timeout=15,
        )
        body = resp.json()
    except (httpx.HTTPError, ValueError) as e:
        raise PaystackError(str(e)) from e
    if resp.status_code != 200 or not body.get("status"):
        raise PaystackError(body.get("message", "Paystack initialize failed"))
    return body["data"]  # authorization_url, access_code, reference


def verify_transaction(reference: str) -> dict:
    try:
        resp = httpx.get(f"{BASE_URL}/transaction/verify/{reference}", headers=_headers(), timeout=15)
        body = resp.json()
    except (httpx.HTTPError, ValueError) as e:
        raise PaystackError(str(e)) from e
    if resp.status_code != 200 or not body.get("status"):
        raise PaystackError(body.get("message", "Paystack verify failed"))
    return body["data"]  # status, amount, currency, reference ...


def valid_signature(raw_body: bytes, signature: str | None) -> bool:
    if not signature or not settings.paystack_secret_key:
        return False
    expected = hmac.new(settings.paystack_secret_key.encode(), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(expected, signature)