# backend/app/services/storage.py — thin Supabase Storage client (service-role, server-side only)
import httpx
from app.core.config import settings


class StorageError(Exception):
    pass


def upload_object(bucket: str, path: str, data: bytes, content_type: str) -> None:
    if not settings.supabase_service_role_key:
        raise StorageError("SUPABASE_SERVICE_ROLE_KEY is not configured")
    url = f"{settings.supabase_url}/storage/v1/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
        "Content-Type": content_type,
        "x-upsert": "true",  # overwrite the user's previous avatar/CV
    }
    try:
        resp = httpx.post(url, content=data, headers=headers, timeout=20)
    except httpx.HTTPError as exc:
        raise StorageError(str(exc)) from exc
    if resp.status_code >= 300:
        raise StorageError(f"Storage upload failed ({resp.status_code}): {resp.text[:200]}")


def public_url(bucket: str, path: str) -> str:
    """Only valid for buckets marked public (avatars)."""
    return f"{settings.supabase_url}/storage/v1/object/public/{bucket}/{path}"