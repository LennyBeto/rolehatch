# backend/app/api/routes/chat.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chatbot import ask_perchie

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=ChatResponse)
@limiter.limit("15/minute;150/day")  # protects your LLM bill
async def chat(request: Request, payload: ChatRequest, db: Session = Depends(get_db)):
    reply = await ask_perchie(db, [m.model_dump() for m in payload.messages])
    return {"reply": reply}