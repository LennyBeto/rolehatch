# backend/app/api/routes/resume.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.session import get_db
from app.core.security import get_current_user
from app.core.embeddings import embed_text
from app.models.resume import UserResume
from app.schemas.resume import ResumeCreate, ResumeOut

router = APIRouter()


@router.post("", response_model=ResumeOut)
async def upsert_resume(payload: ResumeCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    embedding = await embed_text(payload.resume_text)
    # Embedding failure isn't fatal — save the text regardless so the user
    # isn't blocked; match scoring just won't kick in until a retry succeeds.

    stmt = pg_insert(UserResume).values(
        user_id=user["sub"], resume_text=payload.resume_text, embedding=embedding,
    ).on_conflict_do_update(
        index_elements=["user_id"],
        set_={"resume_text": payload.resume_text, "embedding": embedding, "updated_at": func.now()},
    )
    db.execute(stmt)
    db.commit()

    record = db.query(UserResume).filter_by(user_id=user["sub"]).first()
    return ResumeOut(resume_text=record.resume_text, updated_at=record.updated_at, has_embedding=record.embedding is not None)


@router.get("", response_model=ResumeOut)
def get_resume(user=Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(UserResume).filter_by(user_id=user["sub"]).first()
    if not record:
        raise HTTPException(404, "No resume on file")
    return ResumeOut(resume_text=record.resume_text, updated_at=record.updated_at, has_embedding=record.embedding is not None)


@router.delete("", status_code=204)
def delete_resume(user=Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(UserResume).filter_by(user_id=user["sub"]).delete()
    db.commit()