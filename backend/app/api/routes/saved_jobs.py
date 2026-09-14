# backend/app/api/routes/saved_jobs.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.job import SavedJob
from app.schemas.saved_job import SavedJobCreate, SavedJobUpdate

router = APIRouter()

ALLOWED_STATUSES = {"saved", "applied", "hidden"}

@router.post("")
def save_job(payload: SavedJobCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(400, "Invalid status")

    stmt = pg_insert(SavedJob).values(
        user_id=user["sub"], job_id=payload.job_id, status=payload.status,
    ).on_conflict_do_update(
        index_elements=["user_id", "job_id"], set_={"status": payload.status},
    )
    db.execute(stmt)
    db.commit()
    return {"ok": True}

@router.patch("/{job_id}")
def update_saved_job(job_id: str, payload: SavedJobUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(400, "Invalid status")

    record = db.query(SavedJob).filter_by(user_id=user["sub"], job_id=job_id).first()
    if not record:
        raise HTTPException(404, "Not found")
    record.status = payload.status
    db.commit()
    return {"ok": True}

@router.get("")
def list_saved_jobs(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SavedJob).filter_by(user_id=user["sub"]).all()