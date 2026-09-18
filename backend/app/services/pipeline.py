# backend/app/services/pipeline.py
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.models.job import Job, Company
from app.core.cache import redis
from app.services.scrapers.greenhouse import GreenhouseScraper
from app.services.scrapers.lever import LeverScraper
from app.services.scrapers.workday import WorkdayScraper
from app.services.scrapers.bamboohr import BambooHRScraper
import logging

logger = logging.getLogger("rolehatch.pipeline")

SCRAPERS = {
    "greenhouse": lambda c: GreenhouseScraper().scrape(c.board_token),
    "lever": lambda c: LeverScraper().scrape(c.board_token),
    "workday": lambda c: WorkdayScraper().scrape(*(c.board_token.split(":") + [None, None, None])[:3]),
    "bamboohr": lambda c: BambooHRScraper().scrape(c.board_token),
}

async def sync_company(db: Session, company: Company):
    scrape_fn = SCRAPERS.get(company.source_platform)
    if not scrape_fn:
        raise ValueError(f"No scraper registered for source_platform={company.source_platform!r}")

    raw_jobs = await scrape_fn(company)  # let real exceptions bubble up to internal.py's catch

    seen_ids = []
    for j in raw_jobs:
        external_id = j["url"]
        seen_ids.append(external_id)

        redis_key = f"seen:{company.source_platform}:{external_id}"
        if redis.get(redis_key):
            continue

        stmt = pg_insert(Job).values(
            company_id=company.id,
            title=j["title"],
            location=j.get("location"),
            source=company.source_platform,
            source_url=j["url"],
            external_id=external_id,
            is_active=True,
        ).on_conflict_do_update(
            index_elements=["source", "external_id"],
            set_={"title": j["title"], "location": j.get("location"),
                  "is_active": True, "scraped_at": func.now()},
        )
        db.execute(stmt)
        redis.set(redis_key, "1", ex=86400)

    db.query(Job).filter(
        Job.company_id == company.id,
        Job.external_id.notin_(seen_ids),
        Job.is_active.is_(True),
    ).update({"is_active": False}, synchronize_session=False)

    db.commit()