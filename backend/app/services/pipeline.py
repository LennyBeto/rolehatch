# backend/app/services/pipeline.py
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from dateutil import parser as date_parser
from app.models.job import Job, Company
from app.core.cache import redis
from app.core.embeddings import embed_text
from app.services.scrapers.greenhouse import GreenhouseScraper
from app.services.scrapers.lever import LeverScraper
from app.services.scrapers.workday import WorkdayScraper
from app.services.scrapers.bamboohr import BambooHRScraper
import html
import logging
import re

logger = logging.getLogger("perchrole.pipeline")

# Bare "go" is intentionally excluded: it matches "go above and beyond",
# "go-to-market", etc. Use "golang" (the sidebar's Go filter value).
TECH_KEYWORDS = [
    "python", "django", "fastapi", "flask", "javascript", "typescript",
    "react", "next.js", "vue", "node.js", "java", "golang", "rust",
    "c#", ".net", "postgresql", "postgres", "mysql", "mongodb", "redis",
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "graphql",
    "rest api", "sql", "swift", "kotlin", "ruby", "rails", "php", "laravel",
]

SENIOR_KEYWORDS = ["senior", "staff", "principal", "lead", "director", "vp", "head of"]
ENTRY_KEYWORDS = ["junior", "entry", "associate", "intern", "graduate"]

SCRAPERS = {
    "greenhouse": lambda c: GreenhouseScraper().scrape(c.board_token),
    "lever": lambda c: LeverScraper().scrape(c.board_token),
    "workday": lambda c: WorkdayScraper().scrape(*(c.board_token.split(":") + [None, None, None])[:3]),
    "bamboohr": lambda c: BambooHRScraper().scrape(c.board_token),
}


def _parse_posted_at(raw_value: str | None):
    if not raw_value:
        return None
    try:
        return date_parser.isoparse(raw_value)
    except (ValueError, TypeError):
        return None


def _strip_html(raw_html: str | None) -> str | None:
    """Convert HTML to readable plain text, keeping paragraph and bullet breaks
    so the job detail page (white-space: pre-wrap) renders them properly."""
    if not raw_html:
        return None
    # Greenhouse sends entity-escaped HTML (&lt;p&gt;...), so unescape first
    text = html.unescape(raw_html)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</(p|div|h[1-6]|ul|ol)>", "\n\n", text)
    text = re.sub(r"(?i)<li[^>]*>", "• ", text)
    text = re.sub(r"(?i)</li>", "\n", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" ?\n ?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() or None


def _infer_level(title: str) -> str:
    title_lower = title.lower()
    if any(kw in title_lower for kw in SENIOR_KEYWORDS):
        return "senior"
    if any(kw in title_lower for kw in ENTRY_KEYWORDS):
        return "entry"
    return "mid"


def _infer_remote_type(location: str | None) -> str | None:
    if not location:
        return None
    loc_lower = location.lower()
    if "remote" in loc_lower:
        return "remote"
    if "hybrid" in loc_lower:
        return "hybrid"
    return None  # unknown — leave null rather than guessing "onsite" incorrectly


def _extract_tech_stack(description: str | None) -> list[str]:
    if not description:
        return []
    desc_lower = description.lower()
    # Lookarounds instead of \b so "c#" and ".net" match correctly, while
    # "java" still won't match inside "javascript" and "sql" inside "postgresql".
    return [
        kw for kw in TECH_KEYWORDS
        if re.search(rf"(?<!\w){re.escape(kw)}(?!\w)", desc_lower)
    ]


async def sync_company(db: Session, company: Company) -> dict:
    scrape_fn = SCRAPERS.get(company.source_platform)
    if not scrape_fn:
        raise ValueError(f"No scraper registered for source_platform={company.source_platform!r}")

    raw_jobs = await scrape_fn(company)  # let real exceptions bubble up to internal.py's catch

    # Guard: an empty result is almost always a scrape failure, not "0 open roles".
    # Deactivating everything here would wipe the company's listings.
    if not raw_jobs:
        logger.warning("Empty scrape for %s — skipping deactivation", company.name)
        return {"fetched": 0, "skipped": True}

    seen_ids: list[str] = []
    pending_redis_keys: list[str] = []

    try:
        for j in raw_jobs:
            external_id = j["url"]
            seen_ids.append(external_id)

            redis_key = f"seen:{company.source_platform}:{external_id}"
            if redis.get(redis_key):
                continue

            posted_at = _parse_posted_at(j.get("posted_at"))
            description = _strip_html(j.get("content"))
            level = _infer_level(j["title"])
            remote_type = _infer_remote_type(j.get("location"))
            tech_stack = _extract_tech_stack(description)
            # Embed on description when available, falling back to title so
            # sparse postings (Workday/BambooHR often omit content) still get
            # a usable vector for match scoring. embed_text returns None on
            # any failure — never blocks or fails the sync run.
            embedding = await embed_text(description or j["title"])

            stmt = pg_insert(Job).values(
                company_id=company.id,
                title=j["title"],
                location=j.get("location"),
                source=company.source_platform,
                source_url=j["url"],
                external_id=external_id,
                is_active=True,
                posted_at=posted_at,
                description=description,
                level=level,
                remote_type=remote_type,
                tech_stack=tech_stack,
                embedding=embedding,
            ).on_conflict_do_update(
                index_elements=["source", "external_id"],
                set_={
                    "title": j["title"],
                    "location": j.get("location"),
                    "is_active": True,
                    "scraped_at": func.now(),
                    "posted_at": posted_at,
                    "description": description,
                    "level": level,
                    "remote_type": remote_type,
                    "tech_stack": tech_stack,
                    "embedding": embedding,
                },
            )
            db.execute(stmt)
            pending_redis_keys.append(redis_key)

        db.query(Job).filter(
            Job.company_id == company.id,
            Job.source == company.source_platform,
            Job.external_id.notin_(seen_ids),
            Job.is_active.is_(True),
        ).update({"is_active": False}, synchronize_session=False)

        db.commit()
    except Exception:
        db.rollback()  # never leave a failed transaction for the next company
        raise

    # Mark as seen ONLY after the commit succeeded, so a failed or timed-out
    # sync never causes jobs to be skipped for the next 24 hours.
    for key in pending_redis_keys:
        redis.set(key, "1", ex=86400)

    return {"fetched": len(raw_jobs), "upserted": len(pending_redis_keys)}