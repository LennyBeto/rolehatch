# backend/app/services/scrapers/bamboohr.py
import logging

from .base import BaseScraper

logger = logging.getLogger("perchrole.bamboohr")


class BambooHRScraper(BaseScraper):
    async def scrape(self, subdomain: str):
        data = await self.fetch(f"https://{subdomain}.bamboohr.com/careers/list")
        result = []
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
            # Only fetch detail for new postings — the pipeline skips seen ones anyway
            if j.get("id") and not self.already_synced("bamboohr", job_url):
                info = await self._fetch_detail(subdomain, j["id"])
                job["content"] = info.get("description")
                job["posted_at"] = info.get("datePosted")
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