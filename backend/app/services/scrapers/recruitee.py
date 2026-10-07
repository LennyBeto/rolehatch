# backend/app/services/scrapers/recruitee.py
from .base import BaseScraper


class RecruiteeScraper(BaseScraper):
    async def scrape(self, company: str):
        data = await self.fetch(f"https://{company}.recruitee.com/api/offers/")
        jobs = []
        for j in data.get("offers", []):
            if j.get("status") not in (None, "published"):
                continue
            url = j.get("careers_url")
            if not url:
                continue
            content = " ".join(x for x in [j.get("description"), j.get("requirements")] if x) or None
            jobs.append({
                "title": j.get("title"),
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