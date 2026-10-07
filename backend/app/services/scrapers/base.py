# backend/app/services/scrapers/base.py
import asyncio

import httpx

from app.core.cache import redis

SEEN_KEY_VERSION = "v2"  # bump to force a one-time re-sync of every job
RETRY_STATUS = {429, 500, 502, 503, 504}


def seen_key(platform: str, url: str) -> str:
    """Single source of truth for the dedup key, used by the pipeline and the scrapers."""
    return f"seen:{SEEN_KEY_VERSION}:{platform}:{url}"


class BaseScraper:
    user_agent = "PerchRoleBot/1.0 (+https://perchrole.com/bot)"
    max_retries = 3

    async def _request(self, method: str, url: str, **kwargs) -> dict | list:
        """HTTP call with retry + exponential backoff on 429/5xx and network errors.
        Other 4xx errors fail immediately. After the last attempt the error is
        raised, so the pipeline never treats a failed fetch as an empty board."""
        async with httpx.AsyncClient(
            headers={"User-Agent": self.user_agent}, timeout=15, follow_redirects=True
        ) as client:
            for attempt in range(1, self.max_retries + 1):
                try:
                    resp = await client.request(method, url, **kwargs)
                    if resp.status_code in RETRY_STATUS and attempt < self.max_retries:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    resp.raise_for_status()
                    return resp.json()
                except (httpx.TimeoutException, httpx.TransportError):
                    if attempt == self.max_retries:
                        raise
                    await asyncio.sleep(2 ** attempt)

    async def fetch(self, url: str, params: dict | None = None) -> dict | list:
        return await self._request("GET", url, params=params)

    async def post(self, url: str, json: dict | None = None) -> dict | list:
        return await self._request("POST", url, json=json)

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