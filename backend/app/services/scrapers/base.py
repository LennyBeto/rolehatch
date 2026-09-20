# backend/app/services/scrapers/base.py
import httpx

class BaseScraper:
    user_agent = "PerchRoleBot/1.0 (+https://perchrole.com/bot)"

    async def fetch(self, url: str) -> dict:
        async with httpx.AsyncClient(headers={"User-Agent": self.user_agent}, timeout=15) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()