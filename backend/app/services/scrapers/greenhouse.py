# backend/app/services/scrapers/greenhouse.py
from .base import BaseScraper

class GreenhouseScraper(BaseScraper):
    async def scrape(self, board_token: str):
        data = await self.fetch(f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs")
        return [
            {"title": j["title"], "location": j.get("location", {}).get("name"),
             "url": j["absolute_url"], "source": "greenhouse"}
            for j in data.get("jobs", [])
        ]