# backend/app/services/scrapers/lever.py
from datetime import datetime, timezone

from .base import BaseScraper


def _build_content(j: dict) -> str:
    """Combine Lever's intro, requirement lists, and closing text into one HTML string."""
    parts = [j.get("description") or ""]
    for section in j.get("lists", []) or []:
        parts.append(f"<h3>{section.get('text', '')}</h3><ul>{section.get('content', '')}</ul>")
    parts.append(j.get("additional") or "")
    return "".join(parts)


def _created_at_iso(j: dict) -> str | None:
    """Lever sends createdAt as epoch milliseconds; pipeline expects an ISO 8601 string."""
    ms = j.get("createdAt")
    if not ms:
        return None
    try:
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat()
    except (TypeError, ValueError, OverflowError, OSError):
        return None  # malformed timestamp must not fail the whole company sync


class LeverScraper(BaseScraper):
    async def scrape(self, company: str):
        data = await self.fetch(f"https://api.lever.co/v0/postings/{company}?mode=json")
        if not isinstance(data, list):
            # Lever returns an error object (not a list) for bad/unknown company slugs.
            # Raise so sync_company reports a real failure instead of iterating dict keys.
            raise ValueError(f"Unexpected Lever response for {company!r}: {str(data)[:200]}")

        jobs = []
        for j in data:
            if not j.get("text") or not j.get("hostedUrl"):
                continue  # skip malformed postings rather than KeyError-ing the whole board
            jobs.append({
                "title": j["text"],
                "location": (j.get("categories") or {}).get("location"),
                "url": j["hostedUrl"],
                "source": "lever",
                "posted_at": _created_at_iso(j),
                "content": _build_content(j),
            })
        return jobs