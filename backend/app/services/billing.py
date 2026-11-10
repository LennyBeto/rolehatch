# backend/app/services/billing.py
import hashlib
import hmac
import logging
from datetime import datetime, timezone

import httpx
from dateutil import parser as date_parser
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.billing import EmployerSubscription

logger = logging.getLogger("perchrole.billing")

PAYSTACK_BASE_URL = "https://api.paystack.co"
FEATURED_PRICE_CENTS = 4900        # $49 one-time, 14 days
FEATURED_CURRENCY = "USD"
FEATURE_DAYS = 14
PERIOD_DAYS = 30

# Plan definitions. None = unlimited.
PLANS = {
    "starter": {
        "name": "Starter",
        "amount_cents": 2900,
        "featured_credits": 2,
        "refresh_credits": 2,
        "partner_logo": False,
    },
    "growth": {
        "name": "Growth",
        "amount_cents": 9900,
        "featured_credits": 6,
        "refresh_credits": 8,
        "partner_logo": False,
    },
    "enterprise": {
        "name": "Enterprise",
        "amount_cents": 24900,
        "featured_credits": None,
        "refresh_credits": None,
        "partner_logo": True,
    },
}

FREE_MAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "icloud.com",
    "aol.com", "proton.me", "protonmail.com", "yandex.com", "gmx.com", "mail.com",
}


def _plan_codes() -> dict[str, str]:
    return {
        "starter": settings.paystack_plan_starter,
        "growth": settings.paystack_plan_growth,
        "enterprise": settings.paystack_plan_enterprise,
    }


def plan_code_for(plan_id: str) -> str:
    code = _plan_codes().get(plan_id)
    if not code:
        raise HTTPException(503, f"The {PLANS[plan_id]['name']} plan isn't available yet")
    return code


def plan_id_for_code(code: str | None) -> str | None:
    if not code:
        return None
    for plan_id, plan_code in _plan_codes().items():
        if plan_code and plan_code == code:
            return plan_id
    return None


def email_domain(email: str | None) -> str:
    if not email or "@" not in email:
        return ""
    return email.split("@")[-1].strip().lower()


def require_business_domain(email: str | None) -> str:
    domain = email_domain(email)
    if not domain or domain in FREE_MAIL_DOMAINS:
        raise HTTPException(
            403,
            "Plans are available to company email addresses. Sign in with your work email to continue.",
        )
    return domain


def paystack_request(method: str, path: str, payload: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {settings.paystack_secret_key}"}
    try:
        resp = httpx.request(
            method, f"{PAYSTACK_BASE_URL}{path}", json=payload, headers=headers, timeout=15,
        )
    except httpx.HTTPError:
        raise HTTPException(502, "Payment provider unreachable, please try again")
    try:
        body = resp.json()
    except ValueError:
        body = {}
    if resp.status_code >= 400 or not body.get("status"):
        logger.error("Paystack %s %s failed: %s", method, path, body.get("message"))
        raise HTTPException(502, body.get("message") or "Payment provider error")
    return body


def initialize_transaction(
    *,
    email: str,
    reference: str,
    callback_path: str,
    metadata: dict,
    amount_cents: int | None = None,
    currency: str | None = None,
    plan_code: str | None = None,
) -> str:
    payload = {
        "email": email,
        "reference": reference,
        "callback_url": f"{settings.frontend_url}{callback_path}",
        "metadata": metadata,
    }
    if plan_code:
        payload["plan"] = plan_code           # Paystack bills the plan amount
    else:
        payload["amount"] = amount_cents
        payload["currency"] = currency
    body = paystack_request("POST", "/transaction/initialize", payload)
    return body["data"]["authorization_url"]


def verify_signature(raw_body: bytes, signature: str | None) -> bool:
    if not signature:
        return False
    expected = hmac.new(settings.paystack_secret_key.encode(), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(expected, signature)


def to_datetime(value) -> datetime | None:
    if not value:
        return None
    try:
        return date_parser.isoparse(value)
    except (ValueError, TypeError):
        return None


def live_subscription(db: Session, domain: str, lock: bool = False) -> EmployerSubscription | None:
    """Active or cancelled-but-still-paid subscription for a domain."""
    query = db.query(EmployerSubscription).filter_by(email_domain=domain)
    if lock:
        query = query.with_for_update()
    sub = query.first()
    if not sub or sub.status not in ("active", "cancelled"):
        return None
    if not sub.current_period_end or sub.current_period_end <= datetime.now(timezone.utc):
        return None
    return sub


def has_credit(remaining: int | None) -> bool:
    return remaining is None or remaining > 0


def entitlements(sub: EmployerSubscription | None) -> dict:
    if sub is None:
        return {
            "plan": None,
            "plan_name": None,
            "status": None,
            "current_period_end": None,
            "featured_remaining": 0,
            "refresh_remaining": 0,
            "partner_logo": False,
        }
    plan = PLANS[sub.plan_id]
    featured = plan["featured_credits"]
    refresh = plan["refresh_credits"]
    return {
        "plan": sub.plan_id,
        "plan_name": plan["name"],
        "status": sub.status,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "featured_remaining": None if featured is None else max(0, featured - sub.featured_used),
        "refresh_remaining": None if refresh is None else max(0, refresh - sub.bumps_used),
        "partner_logo": plan["partner_logo"],
    }