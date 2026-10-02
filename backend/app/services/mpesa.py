# backend/app/services/mpesa.py
import base64
import httpx
from datetime import datetime
from zoneinfo import ZoneInfo

from app.core.config import settings

BASE_URLS = {
    "sandbox": "https://sandbox.safaricom.co.ke",
    "production": "https://api.safaricom.co.ke",
}


class MpesaError(Exception):
    """Raised when Daraja is unreachable or rejects a request."""


def _base_url() -> str:
    return BASE_URLS.get(settings.mpesa_env, BASE_URLS["sandbox"])


def _with_token(url: str) -> str:
    """Daraja callbacks are unsigned, so a shared secret in the URL is the gate."""
    return f"{url}?token={settings.mpesa_callback_secret}"


def normalize_phone(raw: str) -> str:
    """Convert 07XXXXXXXX / +2547XXXXXXXX / 2547XXXXXXXX into 2547XXXXXXXX (Daraja format)."""
    digits = "".join(c for c in raw if c.isdigit())
    if digits.startswith("0"):
        digits = "254" + digits[1:]
    elif digits.startswith("7") or digits.startswith("1"):
        digits = "254" + digits
    if not (digits.startswith("254") and len(digits) == 12 and digits[3] in "17"):
        raise ValueError(f"Invalid Kenyan phone number: {raw!r}")
    return digits


async def get_access_token() -> str:
    auth = base64.b64encode(
        f"{settings.mpesa_consumer_key}:{settings.mpesa_consumer_secret}".encode()
    ).decode()

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials",
                headers={"Authorization": f"Basic {auth}"},
            )
            resp.raise_for_status()
            return resp.json()["access_token"]
    except (httpx.HTTPError, KeyError, ValueError) as e:
        raise MpesaError(f"Could not get Daraja access token: {e}") from e


def _generate_password_and_timestamp() -> tuple[str, str]:
    timestamp = datetime.now(ZoneInfo("Africa/Nairobi")).strftime("%Y%m%d%H%M%S")
    raw = f"{settings.mpesa_shortcode}{settings.mpesa_passkey}{timestamp}"
    password = base64.b64encode(raw.encode()).decode()
    return password, timestamp


async def _post(path: str, payload: dict, timeout: int = 20) -> dict:
    token = await get_access_token()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"{_base_url()}{path}",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )
            data = resp.json()
    except (httpx.HTTPError, ValueError) as e:
        raise MpesaError(f"Daraja request failed: {e}") from e

    if str(data.get("ResponseCode")) != "0":
        raise MpesaError(
            data.get("errorMessage") or data.get("ResponseDescription") or "Daraja rejected the request"
        )
    return data


async def initiate_stk_push(phone_number: str, amount: int, account_reference: str, description: str) -> dict:
    """Trigger an STK Push (Lipa Na M-Pesa Online) prompt on the payer's phone."""
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
        "CallBackURL": _with_token(settings.mpesa_callback_url),
        "AccountReference": account_reference[:12],  # Daraja limit
        "TransactionDesc": description[:13],  # Daraja limit
    }
    return await _post("/mpesa/stkpush/v1/processrequest", payload)


async def query_stk_status(checkout_request_id: str) -> dict:
    """Poll Daraja for the result of a pending STK push, as a fallback if the callback is delayed."""
    password, timestamp = _generate_password_and_timestamp()

    payload = {
        "BusinessShortCode": settings.mpesa_shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id,
    }
    return await _post("/mpesa/stkpushquery/v1/query", payload, timeout=15)


async def initiate_b2c_payment(originator_id: str, phone_number: str, amount: int, remarks: str) -> dict:
    """Send money from the business shortcode to a customer's M-Pesa (wallet withdrawal)."""
    payload = {
        "OriginatorConversationID": originator_id,  # our tx id, echoed back in the result callback
        "InitiatorName": settings.mpesa_initiator_name,
        "SecurityCredential": settings.mpesa_security_credential,
        "CommandID": "BusinessPayment",
        "Amount": amount,
        "PartyA": settings.mpesa_shortcode,
        "PartyB": phone_number,
        "Remarks": remarks[:100],
        "QueueTimeOutURL": _with_token(settings.mpesa_timeout_url),
        "ResultURL": _with_token(settings.mpesa_result_url),
        "Occasion": "Withdrawal",
    }
    return await _post("/mpesa/b2c/v1/paymentrequest", payload, timeout=30)