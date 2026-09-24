# backend/app/api/routes/applicant_profile.py
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.storage import upload_cv
from app.db.session import get_db
from app.models.applicant_profile import ApplicantProfile
from app.schemas.applicant_profile import ApplicantProfileOut

router = APIRouter()

MAX_CV_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
ALLOWED_CV_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.post("/me", response_model=ApplicantProfileOut)
async def upsert_my_profile(
    first_name: str = Form(...),
    last_name: str = Form(...),
    job_title: str = Form(...),
    is_public: bool = Form(True),
    cv: UploadFile | None = File(None),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register or update the signed-in user's applicant profile, with optional CV upload."""
    profile = db.query(ApplicantProfile).filter_by(user_id=user["sub"]).first()

    cv_url = profile.cv_url if profile else None
    cv_filename = profile.cv_filename if profile else None

    if cv is not None:
        if cv.content_type not in ALLOWED_CV_TYPES:
            raise HTTPException(400, "CV must be a PDF or Word document")
        contents = await cv.read()
        if len(contents) > MAX_CV_SIZE_BYTES:
            raise HTTPException(400, "CV must be under 5MB")

        storage_path = f"{user['sub']}/{uuid.uuid4()}-{cv.filename}"
        cv_url = upload_cv(contents, storage_path, cv.content_type)
        cv_filename = cv.filename

    if profile is None:
        profile = ApplicantProfile(
            id=uuid.uuid4(),
            user_id=user["sub"],
            first_name=first_name,
            last_name=last_name,
            job_title=job_title,
            cv_url=cv_url,
            cv_filename=cv_filename,
            is_public=is_public,
        )
        db.add(profile)
    else:
        profile.first_name = first_name
        profile.last_name = last_name
        profile.job_title = job_title
        profile.cv_url = cv_url
        profile.cv_filename = cv_filename
        profile.is_public = is_public

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/me", response_model=ApplicantProfileOut)
def get_my_profile(user=Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(ApplicantProfile).filter_by(user_id=user["sub"]).first()
    if not profile:
        raise HTTPException(404, "No applicant profile found — register one first")
    return profile


@router.get("/{profile_id}", response_model=ApplicantProfileOut)
def get_public_profile(profile_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Employer-facing: view a specific candidate's profile directly."""
    profile = db.query(ApplicantProfile).filter_by(id=profile_id, is_public=True).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    return profile


@router.get("", response_model=list[ApplicantProfileOut])
def list_public_profiles(
    job_title: str | None = None,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Employer-facing: browse public candidate profiles, optionally filtered by job title."""
    q = db.query(ApplicantProfile).filter_by(is_public=True)
    if job_title:
        q = q.filter(ApplicantProfile.job_title.ilike(f"%{job_title}%"))
    return q.order_by(ApplicantProfile.updated_at.desc()).limit(50).all()