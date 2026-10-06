# backend/app/core/domains.py
from fastapi import HTTPException

FREE_EMAIL_DOMAINS = frozenset({
    "gmail.com", "googlemail.com",
    "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "ymail.com", "rocketmail.com",
    "outlook.com", "outlook.co.uk", "hotmail.com", "hotmail.co.uk", "live.com", "msn.com",
    "icloud.com", "me.com", "mac.com",
    "aol.com",
    "proton.me", "protonmail.com", "pm.me",
    "gmx.com", "gmx.net", "mail.com",
    "zoho.com", "yandex.com", "yandex.ru",
    "fastmail.com", "hey.com", "tutanota.com", "tuta.io",
})


def email_domain(email: str | None) -> str | None:
    """Lower-cased domain part of an email, or None if it can't be determined."""
    if not email or "@" not in email:
        return None
    return email.rsplit("@", 1)[-1].strip().lower() or None


def is_free_email_domain(domain: str | None) -> bool:
    return bool(domain) and domain in FREE_EMAIL_DOMAINS


def get_employer_domain(user: dict) -> str:
    """Return the signed-in user's company domain, or raise if it's missing or a personal mailbox."""
    domain = email_domain(user.get("email"))
    if not domain:
        raise HTTPException(400, "Could not determine your company domain from your account email")
    if is_free_email_domain(domain):
        raise HTTPException(
            403,
            "Personal email addresses (Gmail, Outlook, Yahoo, etc.) can't post or promote jobs. "
            "Please sign in with your company email.",
        )
    return domain