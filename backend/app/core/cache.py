# backend/app/core/cache.py
from upstash_redis import Redis
from app.core.config import settings
import json, hashlib

redis = Redis(url=settings.upstash_redis_url, token=settings.upstash_redis_token)

def cache_key(prefix: str, params: dict) -> str:
    raw = json.dumps(params, sort_keys=True)
    return f"{prefix}:{hashlib.md5(raw.encode()).hexdigest()}"

def get_cached(key: str):
    val = redis.get(key)
    return json.loads(val) if val else None

def set_cached(key: str, value, ttl_seconds: int = 600):
    redis.set(key, json.dumps(value), ex=ttl_seconds)