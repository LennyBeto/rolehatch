# backend/app/services/scrapers/recruitee.py
import re
from .base import BaseScraper

_SUBDOMAIN = re.compile(r"^[a-z0-9-]+$", re.I)


class RecruiteeScraper(BaseScraper):
    async def scrape(self, company: str):
        # Used as a hostname, so it must be a plain subdomain label.
        if not company or not _SUBDOMAIN.match(company):
            raise ValueError(f"Invalid Recruitee subdomain: {company!r}")
        data = await self.fetch(f"https://{company}.recruitee.com/api/offers/")
        jobs = []
        for j in data.get("offers", []):
            if j.get("status") not in (None, "published"):
                continue
            url = j.get("careers_url")
            if not j.get("title") or not url:
                continue
            content = "\n".join(x for x in [j.get("description"), j.get("requirements")] if x) or None
            jobs.append({
                "title": j["title"],
                "location": j.get("location") or ", ".join(
                    x for x in [j.get("city"), j.get("country")] if x
                ) or None,
                "url": url,
                "source": "recruitee",
                "posted_at": j.get("published_at") or j.get("created_at"),
                "content": content,
                "remote_type": "remote" if j.get("remote") else None,
            })
        return jobs