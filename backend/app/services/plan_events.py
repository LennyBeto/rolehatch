# backend/app/services/plan_events.py
# Handles Paystack subscription events for the employer plans. Called from the
# existing shared Paystack webhook AFTER it has verified x-paystack-signature.
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.billing import EmployerSubscription
from app.services import billing


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _is_plan_charge(data: dict) -> bool:
    """charge.success for a plan payment (first charge or renewal)."""
    if (data.get("metadata") or {}).get("kind") == "subscription":
        return True
    plan = data.get("plan")
    code = plan.get("plan_code") if isinstance(plan, dict) else None
    return billing.plan_id_for_code(code) is not None


def _on_subscription_create(db: Session, data: dict) -> None:
    code = data.get("subscription_code")
    plan_id = billing.plan_id_for_code((data.get("plan") or {}).get("plan_code"))
    domain = billing.email_domain((data.get("customer") or {}).get("email"))
    if not code or not plan_id or not domain or domain in billing.FREE_MAIL_DOMAINS:
        return

    sub = db.query(EmployerSubscription).filter_by(email_domain=domain).first()
    new_cycle = sub is None or sub.paystack_subscription_code != code
    if sub is None:
        sub = EmployerSubscription(email_domain=domain)
        db.add(sub)
    if new_cycle:
        sub.featured_used = 0
        sub.bumps_used = 0

    sub.plan_id = plan_id
    sub.status = "active"
    sub.paystack_subscription_code = code
    sub.paystack_email_token = data.get("email_token")
    sub.current_period_end = billing.to_datetime(data.get("next_payment_date")) or (
        _now() + timedelta(days=billing.PERIOD_DAYS)
    )
    db.commit()


def _on_invoice_update(db: Session, data: dict) -> None:
    if not data.get("paid"):
        return
    code = (data.get("subscription") or {}).get("subscription_code")
    if not code:
        return
    sub = db.query(EmployerSubscription).filter_by(paystack_subscription_code=code).first()
    if not sub:
        return

    new_end = billing.to_datetime(data.get("period_end"))
    if new_end and (sub.current_period_end is None or new_end > sub.current_period_end):
        # A new billing period was paid: restore credits.
        sub.featured_used = 0
        sub.bumps_used = 0
        sub.current_period_end = new_end
    if sub.status != "cancelled":
        sub.status = "active"
    db.commit()


def _on_subscription_end(db: Session, data: dict) -> None:
    code = data.get("subscription_code")
    if not code:
        return
    sub = db.query(EmployerSubscription).filter_by(paystack_subscription_code=code).first()
    if sub:
        sub.status = "cancelled"  # perks continue until current_period_end
        db.commit()


def handle_plan_event(db: Session, event: dict) -> bool:
    """Returns True if the event belongs to the employer plans (the caller should stop
    processing it), False if the caller's existing handlers should run as before."""
    kind = event.get("event")
    data = event.get("data") or {}

    if kind == "subscription.create":
        _on_subscription_create(db, data)
        return True
    if kind == "invoice.update":
        _on_invoice_update(db, data)
        return True
    if kind in ("subscription.disable", "subscription.not_renew"):
        _on_subscription_end(db, data)
        return True
    if kind == "charge.success" and _is_plan_charge(data):
        # Access is granted by subscription.create / invoice.update, never by the charge,
        # so keep the wallet and pack handlers from seeing plan payments.
        return True
    return False