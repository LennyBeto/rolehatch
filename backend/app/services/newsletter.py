# backend/app/services/newsletter.py
import hashlib
import hmac
import html
import logging
from urllib.parse import quote

import httpx
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger("perchrole.newsletter")

RESEND_BASE_URL = "https://api.resend.com"
BATCH_SIZE = 100                 # Resend batch limit
BATCH_PAUSE_SECONDS = 0.6        # stays under Resend's default 2 requests/second
MAX_RECIPIENTS_PER_RUN = 5000
MAX_SLOTS_PER_ISSUE = 3
SLOTS_PER_COMPANY_PER_MONTH = 1
MAX_JOBS_PER_ISSUE = 10
MIN_DAYS_BETWEEN_ISSUES = 5
SUBJECT = "New tech roles on PerchRole this week"
# Replace with your real postal address (required by CAN-SPAM-style rules).
FOOTER_ADDRESS = "PerchRole · Nairobi, Kenya"


def normalize_email(email: str) -> str:
    return email.strip().lower()


# ── Signed links (no DB column needed) ───────────────────────

def make_token(purpose: str, email: str) -> str:
    key = settings.scheduler_secret.encode()
    msg = f"newsletter:{purpose}:{normalize_email(email)}".encode()
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


def verify_token(purpose: str, email: str, token: str | None) -> bool:
    return bool(token) and hmac.compare_digest(make_token(purpose, email), token)


def _site() -> str:
    return settings.frontend_url.rstrip("/")


def _signed_query(purpose: str, email: str) -> str:
    e = normalize_email(email)
    return f"?e={quote(e, safe='')}&t={make_token(purpose, e)}"


def confirm_link(email: str) -> str:
    return f"{_site()}/newsletter/confirm{_signed_query('confirm', email)}"


def unsubscribe_page_link(email: str) -> str:
    return f"{_site()}/newsletter/unsubscribe{_signed_query('unsubscribe', email)}"


def one_click_url(email: str) -> str:
    base = settings.api_base_url.rstrip("/")
    return f"{base}/api/newsletter/unsubscribe{_signed_query('unsubscribe', email)}"


# ── Resend ───────────────────────────────────────────────────

def _resend(path: str, payload) -> None:
    if not settings.resend_api_key:
        raise HTTPException(503, "Email sending isn't configured yet")
    try:
        resp = httpx.post(
            f"{RESEND_BASE_URL}{path}",
            json=payload,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            timeout=20,
        )
    except httpx.HTTPError:
        raise HTTPException(502, "Email provider unreachable, please try again")
    if resp.status_code >= 400:
        logger.error("Resend %s failed (%s): %s", path, resp.status_code, resp.text[:300])
        raise HTTPException(502, "Email provider error")


def send_one(message: dict) -> None:
    _resend("/emails", message)


def send_batch(messages: list[dict]) -> None:
    _resend("/emails/batch", messages)


def build_message(email: str, subject: str, html_body: str, text_body: str) -> dict:
    return {
        "from": settings.newsletter_from,
        "to": [email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
        "headers": {
            "List-Unsubscribe": f"<{one_click_url(email)}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    }


def send_confirmation(email: str) -> None:
    link = confirm_link(email)
    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#1F2A24;max-width:480px">'
        '<h2 style="color:#2F4F3F;margin:0 0 12px">Confirm your subscription</h2>'
        "<p>Tap the button to start getting the PerchRole newsletter: fresh tech roles, "
        "straight from employers.</p>"
        f'<p><a href="{html.escape(link, quote=True)}" style="display:inline-block;background:#2F4F3F;'
        'color:#FFFFFF;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:600">'
        "Confirm subscription</a></p>"
        '<p style="font-size:12px;color:#6B7280">If you didn\'t ask for this, ignore this email '
        "and you won't be subscribed.</p></div>"
    )
    text_body = (
        "Confirm your PerchRole newsletter subscription:\n"
        f"{link}\n\nIf you didn't ask for this, ignore this email."
    )
    send_one({
        "from": settings.newsletter_from,
        "to": [email],
        "subject": "Confirm your PerchRole newsletter subscription",
        "html": html_body,
        "text": text_body,
    })


# ── Issue rendering ──────────────────────────────────────────

def _e(value) -> str:
    return html.escape(str(value or ""), quote=True)


def _company_link(site: str, domain: str | None) -> str:
    return f"{site}/companies/{domain}" if domain else site


def render_issue(email: str, jobs: list[dict], slots: list[dict]) -> tuple[str, str]:
    """Returns (html, text). All user-supplied text is escaped."""
    site = _site()
    unsub = unsubscribe_page_link(email)

    slot_cards = "".join(
        '<div style="border:1px solid #E5E3DD;border-radius:8px;padding:16px;margin:0 0 12px;background:#FFFFFF">'
        f'<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6B7280">'
        f'Sponsored · {_e(s["company_name"])}</div>'
        f'<a href="{_e(s["link_url"])}" style="font-size:16px;font-weight:600;color:#2F4F3F;text-decoration:none">'
        f'{_e(s["headline"])}</a>'
        f'<p style="margin:6px 0 0;font-size:14px;color:#1F2A24">{_e(s["blurb"])}</p></div>'
        for s in slots
    )
    slots_section = (
        '<h2 style="font-size:16px;margin:24px 0 12px;color:#1F2A24">Featured by our hiring partners</h2>'
        + slot_cards
        if slots else ""
    )

    job_items = "".join(
        '<li style="margin:0 0 10px">'
        f'<a href="{_e(_company_link(site, j["domain"]))}" style="color:#2F4F3F;font-weight:600;text-decoration:none">'
        f'{_e(j["title"])}</a><br>'
        f'<span style="font-size:13px;color:#6B7280">{_e(j["company_name"])} · '
        f'{_e(j["location"] or "Location unspecified")}</span></li>'
        for j in jobs
    )
    jobs_section = (
        '<h2 style="font-size:16px;margin:24px 0 12px;color:#1F2A24">New roles this week</h2>'
        f'<ul style="padding-left:18px;margin:0">{job_items}</ul>'
        if jobs else ""
    )

    html_body = (
        '<!doctype html><html><body style="margin:0;background:#F6F5F1;'
        'font-family:Arial,Helvetica,sans-serif;color:#1F2A24">'
        '<div style="max-width:600px;margin:0 auto;padding:24px 16px">'
        '<h1 style="font-size:22px;color:#2F4F3F;margin:0 0 4px">PerchRole</h1>'
        '<p style="margin:0;font-size:14px;color:#6B7280">Fresh tech roles, straight from employers.</p>'
        f"{slots_section}{jobs_section}"
        f'<p style="margin:28px 0 0"><a href="{_e(site)}/#listings" style="display:inline-block;'
        'background:#2F4F3F;color:#FFFFFF;padding:10px 20px;border-radius:999px;'
        'text-decoration:none;font-weight:600">Browse all jobs</a></p>'
        '<hr style="border:none;border-top:1px solid #E5E3DD;margin:28px 0 16px">'
        '<p style="font-size:12px;color:#6B7280;margin:0">You are receiving this because you subscribed '
        f'at perchrole.com. <a href="{_e(unsub)}" style="color:#6B7280">Unsubscribe</a><br>'
        f"{_e(FOOTER_ADDRESS)}</p>"
        "</div></body></html>"
    )

    lines = ["PerchRole: fresh tech roles, straight from employers.", ""]
    if slots:
        lines.append("FEATURED BY OUR HIRING PARTNERS (SPONSORED)")
        for s in slots:
            lines += [f'{s["headline"]} ({s["company_name"]})', s["blurb"], s["link_url"], ""]
    if jobs:
        lines.append("NEW ROLES THIS WEEK")
        for j in jobs:
            lines += [
                f'{j["title"]} at {j["company_name"]} ({j["location"] or "Location unspecified"})',
                _company_link(site, j["domain"]),
                "",
            ]
    lines += [f"Browse all jobs: {site}/#listings", "", f"Unsubscribe: {unsub}", FOOTER_ADDRESS]
    return html_body, "\n".join(lines)