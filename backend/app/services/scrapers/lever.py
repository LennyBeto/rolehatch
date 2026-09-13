# backend/app/services/scrapers/lever.py
from .base import BaseScraper

class LeverScraper(BaseScraper):
    async def scrape(self, company: str):
        data = await self.fetch(f"https://api.lever.co/v0/postings/{company}?mode=json")
        return [
            {"title": j["text"], "location": j.get("categories", {}).get("location"),
             "url": j["hostedUrl"], "source": "lever"}
            for j in data
        ]