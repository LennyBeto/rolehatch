# backend/app/api/routes/applicant_profile.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.applicant_profile import ApplicantProfile
from app.schemas.applicant_profile import ApplicantProfileOut, ApplicantProfileUpdate, CVScanResult
from app.services.cv_parsing import extract_text_from_upload
from app.services.ats_scoring import compute_ats_score

router = APIRouter()

MAX_CV_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
ALLOWED_CV_EXTENSIONS = (".pdf", ".docx", ".txt")


def _get_or_create(db: Session, user_id: str) -> ApplicantProfile:
    profile = db.query(ApplicantProfile).filter_by(user_id=user_id).first()
    if not profile:
        profile = ApplicantProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


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

    try:
        cv_text = extract_text_from_upload(file, raw_bytes)
    except Exception:
        raise HTTPException(400, "Couldn't read that file — try a different format")

    profile = _get_or_create(db, user["sub"])
    profile.cv_filename = file.filename
    profile.cv_text = cv_text
    profile.has_match_score = False  # invalidate any prior scan/embedding on re-upload
    db.commit()

    return {"ok": True, "filename": file.filename}


@router.post("/cv/scan", response_model=CVScanResult)
def scan_cv(user=Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _get_or_create(db, user["sub"])
    if not profile.cv_text:
        raise HTTPException(400, "Upload a CV before running a scan")

    result = compute_ats_score(profile.cv_text)
    profile.has_match_score = True
    db.commit()
    return result