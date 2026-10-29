# backend/app/services/scrapers/ashby.py
# Ashby public Posting API: https://developers.ashbyhq.com/docs/public-job-posting-api
from urllib.parse import quote
from .base import BaseScraper

_WORKPLACE = {"remote": "remote", "hybrid": "hybrid", "onsite": "onsite", "on-site": "onsite"}


class AshbyScraper(BaseScraper):
    async def scrape(self, board: str):
        if not board:
            raise ValueError("Ashby scraper needs a board name (jobs.ashbyhq.com/<board>)")
        data = await self.fetch(
            f"https://api.ashbyhq.com/posting-api/job-board/{quote(board, safe='')}"
        )
        jobs = []
        for j in data.get("jobs", []):
            if j.get("isListed") is False:
                continue
            url = j.get("jobUrl") or j.get("applyUrl")
            if not j.get("title") or not url:
                continue
            remote_type = _WORKPLACE.get(str(j.get("workplaceType") or "").lower())
            if not remote_type and j.get("isRemote"):
                remote_type = "remote"
            jobs.append({
                "title": j["title"],
                "location": j.get("location"),
                "url": url,
                "source": "ashby",
                "posted_at": j.get("publishedAt"),
                "content": j.get("descriptionHtml") or j.get("descriptionPlain"),
                "remote_type": remote_type,
            })
        return jobs