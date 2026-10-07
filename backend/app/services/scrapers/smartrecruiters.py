# backend/app/services/scrapers/smartrecruiters.py
import asyncio
from .base import BaseScraper


class SmartRecruitersScraper(BaseScraper):
    async def scrape(self, company_id: str, max_pages: int = 10):
        jobs, offset, limit = [], 0, 100
        for _ in range(max_pages):
            data = await self.fetch(
                f"https://api.smartrecruiters.com/v1/companies/{company_id}/postings"
                f"?limit={limit}&offset={offset}"
            )
            items = data.get("content", [])
            if not items:
                break
            for p in items:
                loc = p.get("location") or {}
                parts = [loc.get("city"), loc.get("region"), (loc.get("country") or "").upper()]
                location = loc.get("fullLocation") or ", ".join(x for x in parts if x) or None
                remote_type = "remote" if loc.get("remote") else ("hybrid" if loc.get("hybrid") else None)
                jobs.append({
                    "title": p.get("name"),
                    "location": location,
                    "url": f"https://jobs.smartrecruiters.com/{company_id}/{p.get('id')}",
                    "source": "smartrecruiters",
                    "posted_at": p.get("releasedDate"),
                    "content": None,  # list endpoint has no description
                    "remote_type": remote_type,
                })
            offset += limit
            if offset >= data.get("totalFound", 0):
                break
            await asyncio.sleep(0.5)
        return jobs