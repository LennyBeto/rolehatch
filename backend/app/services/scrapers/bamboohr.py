# backend/app/services/scrapers/bamboohr.py
from .base import BaseScraper

class BambooHRScraper(BaseScraper):
    async def scrape(self, subdomain: str):
        data = await self.fetch(f"https://{subdomain}.bamboohr.com/careers/list")
        result = []
        for j in data.get("result", []):
            result.append({
                "title": j.get("jobOpeningName"),
                "location": j.get("location", {}).get("name") if isinstance(j.get("location"), dict) else j.get("location"),
                "url": f"https://{subdomain}.bamboohr.com/careers/{j.get('id')}",
                "source": "bamboohr",
            })
        return result