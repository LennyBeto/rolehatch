# backend/app/services/scrapers/greenhouse.py
from .base import BaseScraper

class GreenhouseScraper(BaseScraper):
    async def scrape(self, board_token: str):
        # content=true is required, otherwise the list endpoint omits job descriptions
        data = await self.fetch(
            f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs",
            params={"content": "true"},
        )
        return [
            {
                "title": j["title"],
                "location": (j.get("location") or {}).get("name"),
                "url": j["absolute_url"],
                "source": "greenhouse",
                # first_published is the true posting date; updated_at is the fallback
                "posted_at": j.get("first_published") or j.get("updated_at"),
                "content": j.get("content"),  # entity-escaped HTML — cleaned in the pipeline
            }
            for j in data.get("jobs", [])
        ]