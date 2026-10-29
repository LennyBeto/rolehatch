# backend/app/services/scrapers/smartrecruiters.py
import asyncio
from urllib.parse import quote
from .base import BaseScraper


class SmartRecruitersScraper(BaseScraper):
    """Errors raise (no partial results), so the pipeline never deactivates
    a company's jobs based on an incomplete scrape."""

    async def scrape(self, company_id: str, max_pages: int = 10):
        if not company_id:
            raise ValueError("SmartRecruiters scraper needs a company identifier")
        safe_id = quote(company_id, safe="")
        jobs, offset, limit = [], 0, 100
        for _ in range(max_pages):
            data = await self.fetch(
                f"https://api.smartrecruiters.com/v1/companies/{safe_id}/postings"
                f"?limit={limit}&offset={offset}"
            )
            items = data.get("content", [])
            if not items:
                break
            for p in items:
                if not p.get("name") or not p.get("id"):
                    continue
                loc = p.get("location") or {}
                parts = [loc.get("city"), loc.get("region"), (loc.get("country") or "").upper()]
                location = loc.get("fullLocation") or ", ".join(x for x in parts if x) or None
                remote_type = "remote" if loc.get("remote") else ("hybrid" if loc.get("hybrid") else None)
                jobs.append({
                    "title": p["name"],
                    "location": location,
                    "url": f"https://jobs.smartrecruiters.com/{safe_id}/{p['id']}",
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