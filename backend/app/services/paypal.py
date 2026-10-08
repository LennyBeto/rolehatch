# backend/app/services/paypal.py
import time
from decimal import ROUND_CEILING, Decimal

import httpx

from app.core.config import settings


class PaypalError(Exception):
    pass


_token_cache: dict = {"value": None, "expires_at": 0.0}


def _base_url() -> str:
    return "https://api-m.paypal.com" if settings.paypal_env == "live" else "https://api-m.sandbox.paypal.com"


def kes_to_usd_cents(amount_kes: int) -> int:
    rate = Decimal(str(settings.paypal_kes_per_usd))
    if rate <= 0:
        raise PaypalError("PayPal exchange rate is not configured")
    usd = Decimal(amount_kes) / rate
    return int((usd * 100).to_integral_value(rounding=ROUND_CEILING))  # round up: never under-collect


def _access_token() -> str:
    if _token_cache["value"] and time.time() < _token_cache["expires_at"] - 60:
        return _token_cache["value"]
    try:
        resp = httpx.post(
            f"{_base_url()}/v1/oauth2/token",
            auth=(settings.paypal_client_id, settings.paypal_client_secret),
            data={"grant_type": "client_credentials"},
            timeout=15,
        )
        body = resp.json()
    except (httpx.HTTPError, ValueError) as e:
        raise PaypalError(str(e)) from e
    if resp.status_code != 200 or "access_token" not in body:
        raise PaypalError(body.get("error_description", "PayPal auth failed"))
    _token_cache["value"] = body["access_token"]
    _token_cache["expires_at"] = time.time() + int(body.get("expires_in", 300))
    return _token_cache["value"]


def _call(method: str, path: str, *, json: dict | None = None, headers: dict | None = None):
    hdrs = {"Authorization": f"Bearer {_access_token()}", "Content-Type": "application/json", **(headers or {})}
    try:
        resp = httpx.request(method, f"{_base_url()}{path}", headers=hdrs, json=json, timeout=20)
        body = resp.json() if resp.content else {}
    except (httpx.HTTPError, ValueError) as e:
        raise PaypalError(str(e)) from e
    return resp, body


def create_order(*, usd_cents: int, custom_id: str, return_url: str, cancel_url: str) -> dict:
    value = f"{Decimal(usd_cents) / 100:.2f}"
    resp, body = _call(
        "POST",
        "/v2/checkout/orders",
        json={
            "intent": "CAPTURE",
            "purchase_units": [{
                "custom_id": custom_id,
                "description": "PerchRole wallet deposit",
                "amount": {"currency_code": "USD", "value": value},
            }],
            "payment_source": {"paypal": {"experience_context": {
                "brand_name": "PerchRole",
                "user_action": "PAY_NOW",
                "shipping_preference": "NO_SHIPPING",
                "return_url": return_url,
                "cancel_url": cancel_url,
            }}},
        },
        headers={"PayPal-Request-Id": custom_id},  # unique per transaction → safe retries
    )
    if resp.status_code not in (200, 201):
        raise PaypalError(body.get("message", "PayPal create order failed"))
    approval_url = next(
        (l["href"] for l in body.get("links", []) if l.get("rel") in ("payer-action", "approve")), None
    )
    if not approval_url:
        raise PaypalError("PayPal did not return an approval link")
    return {"id": body["id"], "approval_url": approval_url}


def get_order(order_id: str) -> dict:
    resp, body = _call("GET", f"/v2/checkout/orders/{order_id}")
    if resp.status_code != 200:
        raise PaypalError(body.get("message", "PayPal get order failed"))
    return body


def capture_order(order_id: str) -> dict:
    resp, body = _call(
        "POST", f"/v2/checkout/orders/{order_id}/capture",
        headers={"PayPal-Request-Id": f"capture-{order_id}"},  # idempotent: webhook + page can both call
    )
    if resp.status_code in (200, 201):
        return body
    issues = {d.get("issue") for d in body.get("details", [])}
    if "ORDER_ALREADY_CAPTURED" in issues:
        return get_order(order_id)
    raise PaypalError(body.get("message", "PayPal capture failed"))


def verify_webhook(headers, event: dict) -> bool:
    if not settings.paypal_webhook_id:
        return False
    resp, body = _call(
        "POST", "/v1/notifications/verify-webhook-signature",
        json={
            "auth_algo": headers.get("paypal-auth-algo"),
            "cert_url": headers.get("paypal-cert-url"),
            "transmission_id": headers.get("paypal-transmission-id"),
            "transmission_sig": headers.get("paypal-transmission-sig"),
            "transmission_time": headers.get("paypal-transmission-time"),
            "webhook_id": settings.paypal_webhook_id,
            "webhook_event": event,
        },
    )
    return resp.status_code == 200 and body.get("verification_status") == "SUCCESS"