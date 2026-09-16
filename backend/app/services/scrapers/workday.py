# backend/app/services/scrapers/workday.py
from .base import BaseScraper
import httpx

class WorkdayScraper(BaseScraper):
    """
    Workday careers sites follow the pattern:
    https://{tenant}.wd{n}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
    Requires a POST, not GET — and pagination via 'offset'.
    """

    async def scrape(self, tenant: str, wd_number: str, site: str, max_pages: int = 5):
        base_url = f"https://{tenant}.wd{wd_number}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs"
        jobs = []
        offset = 0
        limit = 20

        async with httpx.AsyncClient(headers={"User-Agent": self.user_agent}, timeout=15) as client:
            for _ in range(max_pages):
                resp = await client.post(base_url, json={"limit": limit, "offset": offset, "searchText": ""})
                if resp.status_code != 200:
                    break
                data = resp.json()
                postings = data.get("jobPostings", [])
                if not postings:
                    break

                for p in postings:
                    jobs.append({
                        "title": p.get("title"),
                        "location": p.get("locationsText"),
                        "url": f"https://{tenant}.wd{wd_number}.myworkdayjobs.com/{site}{p.get('externalPath', '')}",
                        "source": "workday",
                    })

                offset += limit
                await self._polite_delay()

        return jobs

    async def _polite_delay(self):
        import asyncio
        await asyncio.sleep(1.5)  # avoid hammering a tenant's site — self-throttle regardless of their limits