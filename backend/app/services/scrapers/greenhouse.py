# backend/app/services/scrapers/greenhouse.py
from .base import BaseScraper

class GreenhouseScraper(BaseScraper):
    async def scrape(self, board_token: str):
        data = await self.fetch(f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs")
        return [
            {
                "title": j["title"],
                "location": j.get("location", {}).get("name"),
                "url": j["absolute_url"],
                "source": "greenhouse",
                "posted_at": j.get("updated_at"),  # ISO 8601 string, e.g. "2026-09-10T14:32:00-04:00"
            }
            for j in data.get("jobs", [])
        ]