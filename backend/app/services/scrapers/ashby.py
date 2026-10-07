# backend/app/services/scrapers/ashby.py
from .base import BaseScraper


class AshbyScraper(BaseScraper):
    async def scrape(self, board: str):
        data = await self.fetch(f"https://api.ashbyhq.com/posting-api/job-board/{board}")
        jobs = []
        for j in data.get("jobs", []):
            if j.get("isListed") is False:
                continue
            url = j.get("jobUrl") or j.get("applyUrl")
            if not url:
                continue
            workplace = (j.get("workplaceType") or "").lower()
            remote_type = workplace if workplace in {"remote", "hybrid", "onsite"} else (
                "remote" if j.get("isRemote") else None
            )
            jobs.append({
                "title": j.get("title"),
                "location": j.get("location"),
                "url": url,
                "source": "ashby",
                "posted_at": j.get("publishedAt"),
                "content": j.get("descriptionHtml") or j.get("descriptionPlain"),
                "remote_type": remote_type,
            })
        return jobs