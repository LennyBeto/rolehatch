# backend/app/services/mailer.py
import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("perchrole.mailer")


def _one_line(value: str) -> str:
    """Collapse newlines/tabs so user input can never inject extra mail headers."""
    return " ".join(value.split())


def send_email(*, to: str, subject: str, body: str, reply_to: str | None = None) -> bool:
    """Send a plain-text email via SMTP. Never raises: returns False on failure
    so a mail outage can't break the request that triggered it."""
    if not (settings.smtp_user and settings.smtp_password):
        logger.warning("SMTP not configured; skipping email to %s", to)
        return False

    msg = EmailMessage()
    msg["From"] = f"PerchRole <{settings.smtp_user}>"  # Namecheap requires From == mailbox
    msg["To"] = to
    msg["Subject"] = _one_line(subject)[:200]
    if reply_to:
        msg["Reply-To"] = _one_line(reply_to)
    msg.set_content(body)

    try:
        context = ssl.create_default_context()
        if settings.smtp_port == 465:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context, timeout=15) as s:
                s.login(settings.smtp_user, settings.smtp_password)
                s.send_message(msg)
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
                s.starttls(context=context)
                s.login(settings.smtp_user, settings.smtp_password)
                s.send_message(msg)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False