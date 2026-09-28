# backend/app/api/routes/applicant_profile.py
import base64
import io
import logging
import os
import time
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from starlette.datastructures import Headers

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.applicant_profile import ApplicantProfile
from app.schemas.applicant_profile import ApplicantProfileOut, ApplicantProfileUpdate, CVScanResult
from app.services.cv_parsing import extract_text_from_upload
from app.services.ats_scoring import compute_ats_score

logger = logging.getLogger("perchrole.applicant")
router = APIRouter()

MAX_CV_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
ALLOWED_CV_EXTENSIONS = (".pdf", ".docx", ".txt")

MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2MB
AVATAR_BUCKET = "avatars"

EMBEDDING_MODEL = "models/text-embedding-004"  # 768 dimensions, matches Vector(768)
EMBEDDING_MAX_CHARS = 8000


def _get_or_create(db: Session, user_id: str) -> ApplicantProfile:
    uid = uuid.UUID(str(user_id))
    profile = db.query(ApplicantProfile).filter_by(user_id=uid).first()
    if not profile:
        profile = ApplicantProfile(user_id=uid)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _sniff_image_type(data: bytes) -> str | None:
    """Detect the real image type from magic bytes — never trust the client's content-type."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def _storage_headers(extra: dict | None = None) -> dict:
    if not settings.supabase_service_role_key:
        raise HTTPException(503, "Image storage is not configured")
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }
    if extra:
        headers.update(extra)
    return headers


def _embed_cv_text(text: str) -> list[float] | None:
    """Best-effort Gemini embedding. Returns None (scan still succeeds, match scoring stays off)
    if no key is configured or the API call fails.
    If you already have an embedding helper (e.g. in app/services), call that here instead."""
    api_key = getattr(settings, "gemini_api_key", "") or os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — skipping CV embedding")
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text[:EMBEDDING_MAX_CHARS],
            task_type="retrieval_document",
        )
        embedding = result["embedding"]
        return embedding if len(embedding) == 768 else None
    except Exception:
        logger.exception("CV embedding failed")
        return None


def _rebuild_upload(profile: ApplicantProfile) -> tuple[UploadFile, bytes]:
    """Recreate an UploadFile from the stored base64 so the existing parser can be reused."""
    raw_bytes = base64.b64decode(profile.cv_base64 or "")
    headers = Headers({"content-type": profile.cv_content_type or "application/octet-stream"})
    upload = UploadFile(file=io.BytesIO(raw_bytes), filename=profile.cv_filename, headers=headers)
    return upload, raw_bytes


@router.get("", response_model=ApplicantProfileOut)
def get_profile(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_or_create(db, user["sub"])


@router.put("", response_model=ApplicantProfileOut)
def update_profile(
    payload: ApplicantProfileUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_or_create(db, user["sub"])
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_AVATAR_BYTES:
        raise HTTPException(400, "Image is too large (max 2MB)")

    content_type = _sniff_image_type(raw_bytes)
    if not content_type:
        raise HTTPException(400, "Image must be a PNG, JPG, or WebP file")

    user_id = str(user["sub"])
    object_path = f"{user_id}/avatar"  # one fixed object per user; upsert overwrites it
    upload_url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{AVATAR_BUCKET}/{object_path}"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            upload_url,
            content=raw_bytes,
            headers=_storage_headers({"Content-Type": content_type, "x-upsert": "true"}),
        )
    if resp.status_code not in (200, 201):
        logger.error("Avatar upload failed: %s %s", resp.status_code, resp.text[:200])
        raise HTTPException(502, "Couldn't store the image — please try again")

    # Cache-bust so the browser shows the new photo immediately after a replace.
    public_url = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/"
        f"{AVATAR_BUCKET}/{object_path}?v={int(time.time())}"
    )

    profile = _get_or_create(db, user_id)
    profile.avatar_url = public_url
    db.commit()

    return {"ok": True, "avatar_url": public_url}


@router.delete("/avatar")
async def delete_avatar(user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(user["sub"])
    profile = _get_or_create(db, user_id)

    if profile.avatar_url:
        delete_url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{AVATAR_BUCKET}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.request(
                "DELETE",
                delete_url,
                json={"prefixes": [f"{user_id}/avatar"]},
                headers=_storage_headers(),
            )
        if resp.status_code not in (200, 204, 404):
            logger.error("Avatar delete failed: %s %s", resp.status_code, resp.text[:200])
            raise HTTPException(502, "Couldn't remove the image — please try again")

        profile.avatar_url = None
        db.commit()

    return {"ok": True}  # idempotent: succeeds even if no photo was set


@router.post("/cv")
async def upload_cv(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    filename_lower = (file.filename or "").lower()
    if not filename_lower.endswith(ALLOWED_CV_EXTENSIONS):
        raise HTTPException(400, "CV must be a .pdf, .docx, or .txt file")

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_CV_SIZE_BYTES:
        raise HTTPException(400, "CV file is too large (max 5MB)")

    # Validate the file is readable now, so a bad upload fails here instead of at scan time.
    try:
        await file.seek(0)
        cv_text = extract_text_from_upload(file, raw_bytes)
        if not (cv_text or "").strip():
            raise ValueError("empty text")
    except Exception:
        raise HTTPException(400, "Couldn't read that file — try a different format")

    profile = _get_or_create(db, user["sub"])
    profile.cv_filename = file.filename
    profile.cv_content_type = file.content_type
    profile.cv_base64 = base64.b64encode(raw_bytes).decode("ascii")
    profile.last_ats_score = None
    profile.embedding = None  # invalidate any prior scan/embedding on re-upload
    db.commit()

    return {"ok": True, "filename": file.filename}


@router.post("/cv/scan", response_model=CVScanResult)
def scan_cv(user=Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _get_or_create(db, user["sub"])
    if not profile.cv_base64:
        raise HTTPException(400, "Upload a CV before running a scan")

    try:
        upload, raw_bytes = _rebuild_upload(profile)
        cv_text = extract_text_from_upload(upload, raw_bytes)
    except Exception:
        logger.exception("CV re-parse failed")
        raise HTTPException(400, "Couldn't read your stored CV — please upload it again")

    result = compute_ats_score(cv_text)
    score = result["overall_score"] if isinstance(result, dict) else result.overall_score

    profile.last_ats_score = score
    profile.embedding = _embed_cv_text(cv_text)  # None if unavailable -> match scoring stays off
    db.commit()
    return result