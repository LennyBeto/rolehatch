# backend/app/api/routes/applicant_profile.py — only update_profile changes
import base64
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.embeddings import embed_text
from app.db.session import get_db
from app.models.applicant_profile import ApplicantProfile
from app.schemas.applicant_profile import (
    ApplicantProfileOut, ApplicantProfileUpdate, CVScanResult, EXPERTISE_OPTIONS,
)
from app.services.ats_scan import extract_text, score_cv

router = APIRouter()

MAX_CV_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
ALLOWED_CV_TYPES = {
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _get_or_create_profile(db: Session, user_id: str) -> ApplicantProfile:
    profile = db.query(ApplicantProfile).filter_by(user_id=user_id).first()
    if not profile:
        profile = ApplicantProfile(id=uuid.uuid4(), user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("", response_model=ApplicantProfileOut)
def get_profile(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_or_create_profile(db, user["sub"])


@router.put("", response_model=ApplicantProfileOut)
def update_profile(
    payload: ApplicantProfileUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.expertise and payload.expertise not in EXPERTISE_OPTIONS:
        raise HTTPException(400, "Invalid expertise value")

    profile = _get_or_create_profile(db, user["sub"])
    if payload.full_name is not None:
        profile.full_name = payload.full_name
    if payload.expertise is not None:
        profile.expertise = payload.expertise
    if payload.avatar_id is not None:
        profile.avatar_id = payload.avatar_id
    if payload.is_public is not None:
        profile.is_public = payload.is_public
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/cv", response_model=ApplicantProfileOut)
async def upload_cv(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_CV_TYPES:
        raise HTTPException(400, "Please upload a PDF, DOCX, or plain text file")

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_CV_SIZE_BYTES:
        raise HTTPException(400, "File too large — max size is 5MB")

    profile = _get_or_create_profile(db, user["sub"])
    profile.cv_filename = file.filename
    profile.cv_content_type = file.content_type
    profile.cv_base64 = base64.b64encode(raw_bytes).decode("ascii")
    profile.last_ats_score = None
    profile.embedding = None  # stale until the next scan re-embeds the new file
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/cv/scan", response_model=CVScanResult)
async def scan_cv(user=Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _get_or_create_profile(db, user["sub"])
    if not profile.cv_base64:
        raise HTTPException(400, "Upload a CV before running a scan")

    raw_bytes = base64.b64decode(profile.cv_base64)
    text = extract_text(profile.cv_content_type or "", raw_bytes)

    if not text.strip():
        result = CVScanResult(
            overall_score=20,
            breakdown={"contact_info": 0, "key_sections": 0, "length": 0, "keyword_match": 0, "action_verbs": 0},
            suggestions=[
                "Couldn't extract readable text from your file. Try uploading a text-based PDF "
                "or a DOCX file instead of a scanned image."
            ],
        )
        profile.embedding = None
    else:
        overall, breakdown, suggestions = score_cv(text, profile.expertise)
        result = CVScanResult(overall_score=overall, breakdown=breakdown, suggestions=suggestions)
        profile.embedding = await embed_text(text)

    profile.last_ats_score = result.overall_score
    db.commit()
    return result