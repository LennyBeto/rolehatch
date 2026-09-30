# backend/app/services/scrapers/base.py
import asyncio

import httpx

from app.core.cache import redis


class BaseScraper:
    user_agent = "PerchRoleBot/1.0 (+https://perchrole.com/bot)"

    async def fetch(self, url: str, params: dict | None = None) -> dict:
        async with httpx.AsyncClient(headers={"User-Agent": self.user_agent}, timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()

    def already_synced(self, platform: str, url: str) -> bool:
        """Mirror of the pipeline's dedup key, so scrapers can skip per-job detail
        requests for postings the pipeline will skip anyway."""
        try:
            return bool(redis.get(f"seen:{platform}:{url}"))
        except Exception:
            return False  # cache trouble should never block a scrape

    async def polite_delay(self, seconds: float = 1.0):
        await asyncio.sleep(seconds)