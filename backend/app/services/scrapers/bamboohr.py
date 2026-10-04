# backend/app/services/scrapers/bamboohr.py
import logging

from .base import BaseScraper

logger = logging.getLogger("perchrole.bamboohr")


class BambooHRScraper(BaseScraper):
    async def scrape(
        self,
        subdomain: str,
        skip_urls: set[str] | None = None,
        max_details: int = 40,
    ):
        data = await self.fetch(f"https://{subdomain}.bamboohr.com/careers/list")
        result = []
        fetched = 0
        for j in data.get("result", []):
            job_url = f"https://{subdomain}.bamboohr.com/careers/{j.get('id')}"
            job = {
                "title": j.get("jobOpeningName"),
                "location": j.get("location", {}).get("name") if isinstance(j.get("location"), dict) else j.get("location"),
                "url": job_url,
                "source": "bamboohr",
                "posted_at": None,
                "content": None,
            }
            # Fetch detail only for postings that lack a description in the DB and
            # weren't synced recently; capped per run so descriptions backfill
            # progressively across hourly syncs on large boards.
            if (
                j.get("id")
                and fetched < max_details
                and not self.should_skip_detail("bamboohr", job_url, skip_urls)
            ):
                info = await self._fetch_detail(subdomain, j["id"])
                job["content"] = info.get("description")
                job["posted_at"] = info.get("datePosted")
                fetched += 1
                await self.polite_delay(1.0)
            result.append(job)
        return result

    async def _fetch_detail(self, subdomain: str, job_id) -> dict:
        """One bad detail page must not fail the whole company sync."""
        try:
            data = await self.fetch(f"https://{subdomain}.bamboohr.com/careers/{job_id}/detail")
            return (data.get("result") or {}).get("jobOpening", {}) or {}
        except Exception:
            logger.warning("BambooHR detail fetch failed: %s/%s", subdomain, job_id, exc_info=True)
            return {}