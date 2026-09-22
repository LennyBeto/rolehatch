# backend/app/api/routes/contact.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.session import get_db
from app.models.contact_message import ContactMessage
from app.schemas.contact import ContactMessageCreate

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("", status_code=201)
@limiter.limit("5/hour")
def create_contact_message(request: Request, payload: ContactMessageCreate, db: Session = Depends(get_db)):
    msg = ContactMessage(email=payload.email, subject=payload.subject, message=payload.message)
    db.add(msg)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(500, "Couldn't send your message — please try again")
    return {"ok": True, "message": "We've received your message and will get back to you soon."}