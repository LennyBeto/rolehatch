# backend/app/api/routes/cv.py
import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import get_current_user
from app.schemas.cv import ParseResponse, RenderRequest
from app.services.cv.parser import MAX_BYTES, ats_report, extract_pdf_text, fetch_google_doc_text, parse_cv_text
from app.services.cv.renderer import render_pdf
from app.services.cv.templates import TEMPLATES, public_template

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/templates")
def list_templates(user=Depends(get_current_user)):
    return [public_template(tid) for tid in TEMPLATES]


@router.post("/parse", response_model=ParseResponse)
@limiter.limit("10/minute")
def parse_cv(
    request: Request,
    file: UploadFile | None = File(None),
    google_doc_url: str | None = Form(None),
    user=Depends(get_current_user),
):
    if (file is not None) == bool(google_doc_url):
        raise HTTPException(400, "Provide either a PDF file or a Google Docs link")
    try:
        if file is not None:
            if not (file.filename or "").lower().endswith(".pdf"):
                raise HTTPException(400, "Only PDF files are supported")
            text = extract_pdf_text(file.file.read(MAX_BYTES + 1))
        else:
            text = fetch_google_doc_text(google_doc_url.strip())
    except ValueError as e:
        raise HTTPException(422, str(e))
    cv = parse_cv_text(text)
    return {"cv": cv, "ats": ats_report(cv)}


@router.post("/render")
@limiter.limit("20/minute")
def render_cv(request: Request, payload: RenderRequest, user=Depends(get_current_user)):
    if payload.template_id not in TEMPLATES:
        raise HTTPException(404, "Unknown template")
    pdf = render_pdf(payload.cv, payload.template_id)
    slug = re.sub(r"[^a-z0-9]+", "-", payload.cv.name.lower()).strip("-") or "cv"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{slug}-{payload.template_id}.pdf"'},
    )