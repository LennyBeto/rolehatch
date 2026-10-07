# backend/app/services/pipeline.py
import asyncio
import hashlib
import html
import logging
import re
import uuid

from dateutil import parser as date_parser
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import case, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.embeddings import embed_text
from app.db.session import SessionLocal
from app.models.job import Job, Company
from app.services.scrapers.greenhouse import GreenhouseScraper
from app.services.scrapers.lever import LeverScraper
from app.services.scrapers.workday import WorkdayScraper
from app.services.scrapers.bamboohr import BambooHRScraper
from app.services.scrapers.ashby import AshbyScraper
from app.services.scrapers.smartrecruiters import SmartRecruitersScraper
from app.services.scrapers.workable import WorkableScraper
from app.services.scrapers.recruitee import RecruiteeScraper

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

UPSERT_CHUNK = 200
EMBED_CONCURRENCY = 5
MAX_EMBEDS_PER_RUN = 300   # per company; the rest are embedded on the next hourly run
# If a scrape returns < 30% of a company's currently-active jobs, treat it as a
# partial/failed fetch: upsert what we got but do NOT deactivate anything.
MIN_SCRAPE_RATIO = 0.3

# Each entry receives (company, skip_urls). skip_urls = URLs that already have a
# description in the DB, so detail-based scrapers can skip re-fetching them.
SCRAPERS = {
    "greenhouse": lambda c, skip: GreenhouseScraper().scrape(c.board_token, skip_urls=skip),
    "lever": lambda c, skip: LeverScraper().scrape(c.board_token, skip_urls=skip),
    "workday": lambda c, skip: WorkdayScraper().scrape(
        *(c.board_token.split(":") + [None, None, None])[:3], skip_urls=skip
    ),
    "bamboohr": lambda c, skip: BambooHRScraper().scrape(c.board_token, skip_urls=skip),
    "ashby": lambda c, skip: AshbyScraper().scrape(c.board_token),
    "smartrecruiters": lambda c, skip: SmartRecruitersScraper().scrape(c.board_token),
    "workable": lambda c, skip: WorkableScraper().scrape(c.board_token),
    "recruitee": lambda c, skip: RecruiteeScraper().scrape(c.board_token),
}


def _parse_posted_at(raw_value):
    if not raw_value:
        return None
    try:
        return date_parser.isoparse(str(raw_value))
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


def _external_id(url: str) -> str:
    # external_id is VARCHAR(255); hash overly long URLs so the id stays stable.
    return url if len(url) <= 255 else "h:" + hashlib.sha1(url.encode()).hexdigest()


def _chunks(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def _load_known_state(company_id, platform: str) -> tuple[set[str], set[str], set[str]]:
    """Returns (described_urls, embedded_urls, described_and_embedded_urls)
    for this company's active jobs. Runs in a threadpool with its own session."""
    db = SessionLocal()
    try:
        rows = db.query(
            Job.source_url,
            Job.description.isnot(None),
            Job.embedding.isnot(None),
        ).filter(
            Job.company_id == company_id,
            Job.source == platform,
            Job.is_active.is_(True),
        ).all()
    finally:
        db.close()
    described = {u for u, has_desc, _ in rows if has_desc}
    embedded = {u for u, _, has_emb in rows if has_emb}
    return described, embedded, described & embedded


async def fetch_company_jobs(company: Company) -> list[dict]:
    """Network step (scrape + embeddings) — safe to run concurrently across companies.
    Attaches j["embedding"] only for jobs that need one."""
    scrape_fn = SCRAPERS.get(company.source_platform)
    if not scrape_fn:
        raise ValueError(f"No scraper registered for source_platform={company.source_platform!r}")
    if not company.board_token:
        raise ValueError(f"{company.name} has no board_token")

    described, embedded, described_embedded = await run_in_threadpool(
        _load_known_state, company.id, company.source_platform
    )

    raw_jobs = await scrape_fn(company, described)

    # Embed only what's new, or what just gained a description. Embedding
    # failures return None and never fail the sync (embed_text's contract).
    sem = asyncio.Semaphore(EMBED_CONCURRENCY)
    to_embed = []
    for j in raw_jobs:
        url, title = j.get("url"), j.get("title")
        if not url or not title:
            continue
        description = _strip_html(j.get("content"))
        if url not in embedded or (description and url not in described_embedded):
            to_embed.append((j, description or title))
        if len(to_embed) >= MAX_EMBEDS_PER_RUN:
            break

    async def _embed(j: dict, text: str):
        async with sem:
            j["embedding"] = await embed_text(text)

    if to_embed:
        await asyncio.gather(*(_embed(j, text) for j, text in to_embed))

    return raw_jobs


def persist_company_jobs(db: Session, company: Company, raw_jobs: list[dict]) -> dict:
    """DB step: bulk upsert per chunk + safe stale deactivation."""
    platform = company.source_platform
    rows: dict[str, dict] = {}

    for j in raw_jobs:
        url, title = j.get("url"), j.get("title")
        if not url or not title:
            continue
        ext_id = _external_id(url)
        location = j.get("location")
        location = location[:255] if isinstance(location, str) and location else None
        description = _strip_html(j.get("content"))
        rows[ext_id] = {
            "id": uuid.uuid4(),
            "company_id": company.id,
            "title": title[:300],
            "location": location,
            "source": platform,
            "source_url": url[:1000],
            "external_id": ext_id,
            "is_active": True,
            "is_featured": False,
            "posted_at": _parse_posted_at(j.get("posted_at")),
            "description": description,
            "level": _infer_level(title),
            "remote_type": j.get("remote_type") or _infer_remote_type(location),
            "tech_stack": _extract_tech_stack(description),
            "embedding": j.get("embedding"),
        }

    # An empty result is almost always a scrape failure, not "0 open roles".
    if not rows:
        logger.warning("Empty scrape for %s (%s) — skipping upsert and deactivation", company.name, platform)
        return {"upserted": 0, "deactivated": 0, "skipped": True}

    try:
        for chunk in _chunks(list(rows.values()), UPSERT_CHUNK):
            ins = pg_insert(Job).values(chunk)
            ins = ins.on_conflict_do_update(
                index_elements=["source", "external_id"],
                set_={
                    "title": ins.excluded.title,
                    "location": ins.excluded.location,
                    "level": ins.excluded.level,
                    "remote_type": ins.excluded.remote_type,
                    "is_active": True,          # reactivates jobs that reappeared
                    "scraped_at": func.now(),   # proves the listing was seen this run
                    # Never overwrite stored values with empty ones when a scraper
                    # skipped the detail call or the embedding request failed.
                    "posted_at": func.coalesce(ins.excluded.posted_at, Job.posted_at),
                    "description": func.coalesce(ins.excluded.description, Job.description),
                    "tech_stack": case(
                        (ins.excluded.description.isnot(None), ins.excluded.tech_stack),
                        else_=Job.tech_stack,
                    ),
                    "embedding": func.coalesce(ins.excluded.embedding, Job.embedding),
                },
            )
            db.execute(ins)

        scope = (
            Job.company_id == company.id,
            Job.source == platform,        # never touch 'direct' employer-posted jobs
            Job.is_active.is_(True),
        )
        prev_active = db.query(func.count(Job.id)).filter(*scope).scalar() or 0
        deactivated = 0
        if prev_active >= 20 and len(rows) < prev_active * MIN_SCRAPE_RATIO:
            logger.warning(
                "Suspiciously small scrape for %s: %d vs %d active — skipping deactivation",
                company.name, len(rows), prev_active,
            )
        else:
            deactivated = (
                db.query(Job)
                .filter(*scope, Job.external_id.notin_(list(rows.keys())))
                .update({"is_active": False}, synchronize_session=False)
            )
        db.commit()
    except Exception:
        db.rollback()  # never leave a failed transaction for the next company
        raise

    return {"fetched": len(raw_jobs), "upserted": len(rows), "deactivated": deactivated}


async def sync_company(db: Session, company: Company) -> dict:
    """Single-company manual sync (the hourly run uses fetch + persist directly)."""
    raw_jobs = await fetch_company_jobs(company)
    return persist_company_jobs(db, company, raw_jobs)