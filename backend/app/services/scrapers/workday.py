# backend/app/services/scrapers/workday.py
import logging
import httpx
import re
from datetime import datetime, timezone, timedelta

from .base import BaseScraper

logger = logging.getLogger("perchrole.workday")

_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}")


class WorkdayScraper(BaseScraper):
    """
    Workday careers sites follow the pattern:
    https://{tenant}.wd{n}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
    Requires a POST, not GET — and pagination via 'offset'.
    Descriptions live on a per-job detail endpoint:
    https://{tenant}.wd{n}.myworkdayjobs.com/wday/cxs/{tenant}/{site}{externalPath}
    """

    @staticmethod
    def _posted_on_to_iso(text: str | None) -> str | None:
        """Normalise Workday date fields to something the pipeline can parse.
        - ISO dates ('2026-09-10', detail 'startDate') pass through unchanged.
        - 'Posted Today' / 'Posted Yesterday' / 'Posted 5 Days Ago' -> UTC midnight of that day.
          Midnight keeps the value stable across hourly runs.
        - '30+ Days Ago' is too vague, so None."""
        if not text:
            return None
        text = text.strip()
        if _ISO_DATE.match(text):
            return text
        t = text.lower()
        if "30+" in t:
            return None
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        if "today" in t:
            return today.isoformat()
        if "yesterday" in t:
            return (today - timedelta(days=1)).isoformat()
        m = re.search(r"(\d+)\s+day", t)
        return (today - timedelta(days=int(m.group(1)))).isoformat() if m else None

    async def scrape(
        self,
        tenant: str,
        wd_number: str,
        site: str,
        max_pages: int = 5,
        skip_urls: set[str] | None = None,
        max_details: int = 100,
    ):
        if not tenant or not wd_number or not site:
            raise ValueError(
                f"Workday scraper needs 'tenant:wd_number:site' — got tenant={tenant!r}, "
                f"wd_number={wd_number!r}, site={site!r}. Check this company's board_token format."
            )
        host = f"https://{tenant}.wd{wd_number}.myworkdayjobs.com"
        base_url = f"{host}/wday/cxs/{tenant}/{site}/jobs"
        jobs = []
        offset = 0
        limit = 20
        details_fetched = 0

        async with httpx.AsyncClient(
            headers={"User-Agent": self.user_agent}, timeout=20, follow_redirects=True
        ) as client:
            for _ in range(max_pages):
                resp = await client.post(base_url, json={"limit": limit, "offset": offset, "searchText": ""})
                if resp.status_code != 200:
                    # Raise (don't break): a partial board would deactivate still-open jobs.
                    raise RuntimeError(f"Workday {tenant} returned HTTP {resp.status_code} at offset {offset}")
                data = resp.json()
                postings = data.get("jobPostings", [])
                if not postings:
                    break
                for p in postings:
                    external_path = p.get("externalPath", "")
                    job_url = f"{host}/{site}{external_path}"
                    job = {
                        "title": p.get("title"),
                        "location": p.get("locationsText"),
                        "url": job_url,
                        "source": "workday",
                        # List-level 'postedOn' ("Posted 3 Days Ago") gives every job a date,
                        # even when the detail call is skipped or capped below.
                        "posted_at": self._posted_on_to_iso(p.get("postedOn")),
                        "content": None,
                    }
                    # Only fetch detail for postings that still lack a description,
                    # capped per run so a first sync can't exceed the timeout.
                    if (
                        external_path
                        and details_fetched < max_details
                        and not self.should_skip_detail("workday", job_url, skip_urls)
                    ):
                        info = await self._fetch_detail(client, f"{host}/wday/cxs/{tenant}/{site}{external_path}")
                        job["content"] = info.get("jobDescription")
                        # Exact ISO startDate wins, then the detail's relative text, then the list value.
                        job["posted_at"] = (
                            self._posted_on_to_iso(info.get("startDate"))
                            or self._posted_on_to_iso(info.get("postedOn"))
                            or job["posted_at"]
                        )
                        details_fetched += 1
                        await self.polite_delay(1.0)
                    jobs.append(job)
                offset += limit
                await self.polite_delay(1.5)
        return jobs

    async def _fetch_detail(self, client: httpx.AsyncClient, detail_url: str) -> dict:
        """One bad detail page must not fail the whole company sync."""
        try:
            resp = await client.get(detail_url)
            if resp.status_code != 200:
                return {}
            return resp.json().get("jobPostingInfo", {}) or {}
        except Exception:
            logger.warning("Workday detail fetch failed: %s", detail_url, exc_info=True)
            return {}