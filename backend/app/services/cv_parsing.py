# backend/app/services/cv_parsing.py
import io
from fastapi import UploadFile


def extract_text_from_upload(file: UploadFile, raw_bytes: bytes) -> str:
    filename = (file.filename or "").lower()

    if filename.endswith(".pdf"):
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(raw_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if filename.endswith(".docx"):
        from docx import Document
        doc = Document(io.BytesIO(raw_bytes))
        return "\n".join(p.text for p in doc.paragraphs)

    # .txt and pasted-resume uploads — best-effort plain text decode
    return raw_bytes.decode("utf-8", errors="ignore")