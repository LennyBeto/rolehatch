# backend/app/core/storage.py
from supabase import create_client, Client
from app.core.config import settings

CV_BUCKET = "cvs"

_supabase_client: Client | None = None


def get_storage_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _supabase_client


def upload_cv(file_bytes: bytes, storage_path: str, content_type: str) -> str:
    """Uploads a CV file to the private Supabase 'cvs' bucket and returns its public URL."""
    client = get_storage_client()
    client.storage.from_(CV_BUCKET).upload(
        storage_path,
        file_bytes,
        {"content-type": content_type, "upsert": "true"},
    )
    return client.storage.from_(CV_BUCKET).get_public_url(storage_path)