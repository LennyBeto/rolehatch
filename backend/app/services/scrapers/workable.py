# backend/app/services/scrapers/workable.py
import re
from .base import BaseScraper

_SUBDOMAIN = re.compile(r"^[a-z0-9-]+$", re.I)


class WorkableScraper(BaseScraper):
    async def scrape(self, subdomain: str):
        if not subdomain or not _SUBDOMAIN.match(subdomain):
            raise ValueError(f"Invalid Workable subdomain: {subdomain!r}")
        data = await self.fetch(
            f"https://apply.workable.com/api/v1/widget/accounts/{subdomain}?details=true"
        )
        jobs = []
        for j in data.get("jobs", []):
            url = j.get("url") or j.get("application_url") or j.get("shortlink")
            if not j.get("title") or not url:
                continue
            parts = [j.get("city"), j.get("state"), j.get("country")]
            jobs.append({
                "title": j["title"],
                "location": ", ".join(x for x in parts if x) or None,
                "url": url,
                "source": "workable",
                "posted_at": j.get("published_on") or j.get("created_at"),
                "content": j.get("description"),
                "remote_type": "remote" if j.get("telecommuting") else None,
            })
        return jobs