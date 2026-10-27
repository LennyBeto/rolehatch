# backend/app/core/cache.py
from upstash_redis import Redis
from app.core.config import settings
import json, hashlib, logging

logger = logging.getLogger("perchrole.cache")

redis = Redis(url=settings.upstash_redis_url, token=settings.upstash_redis_token)

# Job-detail entries are versioned so a response-shape change can discard old entries.
# get_job in jobs.py and the invalidators below must all go through job_detail_key().
JOB_DETAIL_PREFIX = "job:v2"


def cache_key(prefix: str, params: dict) -> str:
    raw = json.dumps(params, sort_keys=True)
    return f"{prefix}:{hashlib.md5(raw.encode()).hexdigest()}"


def job_detail_key(job_id: str) -> str:
    return f"{JOB_DETAIL_PREFIX}:{job_id}"


def get_cached(key: str):
    # A cache outage must degrade to "miss", never fail the request.
    try:
        val = redis.get(key)
    except Exception:
        logger.warning("Cache read failed for %s", key, exc_info=True)
        return None
    return json.loads(val) if val else None


def set_cached(key: str, value, ttl_seconds: int = 600):
    try:
        redis.set(key, json.dumps(value), ex=ttl_seconds)
    except Exception:
        logger.warning("Cache write failed for %s", key, exc_info=True)


def invalidate_prefixes(*prefixes: str) -> int:
    """Delete cached keys matching '<prefix>:*' so fresh sync results show immediately.

    A prefix may contain a glob, e.g. 'search*' matches both 'search:<hash>' and the
    versioned 'search_v3:<hash>' used by jobs.py, so bumping the search version later
    can't silently break invalidation again.

    Only touches the given prefixes, so scraper dedup keys (seen:*) and the sync
    lock (lock:*) are left alone.
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
            redis.delete(job_detail_key(job_id))
        invalidate_prefixes("search*", "facets", "stats")
    except Exception:
        logger.exception("Cache invalidation failed")


def invalidate_listing_caches() -> int:
    """Called after each scheduled sync. Also clears every cached job detail
    (job:*), since a sync can deactivate or update any listing.

    Raises on failure; the caller in internal.py catches and logs it so a
    cache problem never fails the sync itself.
    """
    return invalidate_prefixes("search*", "facets", "stats", "job")


def clear_all_cache():
    """Wipe every key in the Redis instance — instant during development
    when you need fresh data to reflect a schema/scraper change without
    waiting out a TTL. Never call this in production: it also clears
    scraper dedup keys (seen:*), forcing every job to be re-upserted on
    the next sync, and clears every user's cached search results at once."""
    redis.flushall()