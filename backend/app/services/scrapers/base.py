# backend/app/services/scrapers/base.py
import asyncio

import httpx

from app.core.cache import redis

SEEN_KEY_VERSION = "v2"  # bump to force a one-time re-sync of every job


def seen_key(platform: str, url: str) -> str:
    """Single source of truth for the dedup key, used by the pipeline and the scrapers."""
    return f"seen:{SEEN_KEY_VERSION}:{platform}:{url}"


class BaseScraper:
    user_agent = "PerchRoleBot/1.0 (+https://perchrole.com/bot)"

    async def fetch(self, url: str, params: dict | None = None) -> dict | list:
        async with httpx.AsyncClient(headers={"User-Agent": self.user_agent}, timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()

    def already_synced(self, platform: str, url: str) -> bool:
        """True if the pipeline will skip this posting anyway (it has a description
        and was synced within the dedup TTL)."""
        try:
            return bool(redis.get(seen_key(platform, url)))
        except Exception:
            return False  # cache trouble should never block a scrape

    def should_skip_detail(self, platform: str, url: str, skip_urls: set[str] | None) -> bool:
        """Skip the per-job detail request if the DB already has a description
        or Redis says it was synced recently."""
        return (skip_urls is not None and url in skip_urls) or self.already_synced(platform, url)

    async def polite_delay(self, seconds: float = 1.0):
        await asyncio.sleep(seconds)