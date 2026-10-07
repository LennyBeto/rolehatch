# backend/app/core/cache.py
from upstash_redis import Redis
from app.core.config import settings
import json, hashlib, logging

logger = logging.getLogger("perchrole.cache")

redis = Redis(url=settings.upstash_redis_url, token=settings.upstash_redis_token)


def cache_key(prefix: str, params: dict) -> str:
    raw = json.dumps(params, sort_keys=True)
    return f"{prefix}:{hashlib.md5(raw.encode()).hexdigest()}"


def get_cached(key: str):
    val = redis.get(key)
    return json.loads(val) if val else None


def set_cached(key: str, value, ttl_seconds: int = 600):
    redis.set(key, json.dumps(value), ex=ttl_seconds)


def invalidate_prefixes(*prefixes: str) -> int:
    """Delete cached keys like 'search:*' so fresh sync results show immediately.

    Only touches the given prefixes, so scraper dedup keys (seen:*) are left alone.
    """
    deleted = 0
    for prefix in prefixes:
        cursor = 0
        while True:
            cursor, keys = redis.scan(cursor, match=f"{prefix}:*", count=200)
            if keys:
                redis.delete(*keys)
                deleted += len(keys)
            if int(cursor) == 0:
                break
    return deleted


def invalidate_job_caches(job_id: str | None = None) -> None:
    """Drop cached search pages, facets and stats, plus one job's detail if given.

    Used after an employer creates, edits or deletes a listing. Best-effort:
    a cache failure must never fail the employer's request.
    """
    try:
        if job_id:
            redis.delete(f"job:{job_id}")
        invalidate_prefixes("search", "facets", "stats")
    except Exception:
        logger.exception("Cache invalidation failed")


def invalidate_listing_caches() -> int:
    """Called after each scheduled sync. Also clears every cached job detail
    (job:*), since a sync can deactivate or update any listing.

    Raises on failure; the caller in internal.py catches and logs it so a
    cache problem never fails the sync itself.
    """
    return invalidate_prefixes("search", "facets", "stats", "job")


def clear_all_cache():
    """Wipe every key in the Redis instance — instant during development
    when you need fresh data to reflect a schema/scraper change without
    waiting out a TTL. Never call this in production: it also clears
    scraper dedup keys (seen:*), forcing every job to be re-upserted on
    the next sync, and clears every user's cached search results at once."""
    redis.flushall()