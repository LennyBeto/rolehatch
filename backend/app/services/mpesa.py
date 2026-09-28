# backend/app/services/mpesa.py
import base64
import httpx
from datetime import datetime, timezone

from app.core.config import settings

BASE_URLS = {
    "sandbox": "https://sandbox.safaricom.co.ke",
    "production": "https://api.safaricom.co.ke",
}


def _base_url() -> str:
    return BASE_URLS.get(settings.mpesa_env, BASE_URLS["sandbox"])


def normalize_phone(raw: str) -> str:
    """Convert 07XXXXXXXX / +2547XXXXXXXX / 2547XXXXXXXX into 2547XXXXXXXX (Daraja format)."""
    digits = "".join(c for c in raw if c.isdigit())
    if digits.startswith("0"):
        digits = "254" + digits[1:]
    elif digits.startswith("7") or digits.startswith("1"):
        digits = "254" + digits
    if not (digits.startswith("254") and len(digits) == 12):
        raise ValueError(f"Invalid Kenyan phone number: {raw!r}")
    return digits


async def get_access_token() -> str:
    auth = base64.b64encode(
        f"{settings.mpesa_consumer_key}:{settings.mpesa_consumer_secret}".encode()
    ).decode()

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {auth}"},
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


def _generate_password_and_timestamp() -> tuple[str, str]:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    raw = f"{settings.mpesa_shortcode}{settings.mpesa_passkey}{timestamp}"
    password = base64.b64encode(raw.encode()).decode()
    return password, timestamp


async def initiate_stk_push(phone_number: str, amount: int, account_reference: str, description: str) -> dict:
    """Trigger an STK Push (Lipa Na M-Pesa Online) prompt on the payer's phone."""
    token = await get_access_token()
    password, timestamp = _generate_password_and_timestamp()

    payload = {
        "BusinessShortCode": settings.mpesa_shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone_number,
        "PartyB": settings.mpesa_shortcode,
        "PhoneNumber": phone_number,
        "CallBackURL": settings.mpesa_callback_url,
        "AccountReference": account_reference[:12],  # Daraja limit
        "TransactionDesc": description[:13],  # Daraja limit
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{_base_url()}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def query_stk_status(checkout_request_id: str) -> dict:
    """Poll Daraja for the result of a pending STK push, as a fallback if the callback is delayed."""
    token = await get_access_token()
    password, timestamp = _generate_password_and_timestamp()

    payload = {
        "BusinessShortCode": settings.mpesa_shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{_base_url()}/mpesa/stkpushquery/v1/query",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json()