# backend/app/services/cv_parser.py — CV text extraction + 30-50 word summary builder
import io
import re

from docx import Document
from pypdf import PdfReader

MIN_WORDS = 30
MAX_WORDS = 50
MAX_PDF_PAGES = 5


class CVParseError(Exception):
    pass


_HEADINGS = (
    r"professional\s+summary|career\s+summary|executive\s+summary|summary|"
    r"professional\s+profile|profile|about\s+me|career\s+objective|objective"
)
HEADING_ONLY_RE = re.compile(rf"^(?:{_HEADINGS})\s*:?$", re.I)
HEADING_INLINE_RE = re.compile(rf"^(?:{_HEADINGS})\s*[:\-–—]\s*(?P<rest>.+)$", re.I)
OTHER_HEADING_RE = re.compile(
    r"^(?:work\s+experience|professional\s+experience|experience|employment(?:\s+history)?|"
    r"education|skills|technical\s+skills|projects|certifications?|languages|references|"
    r"achievements|awards|interests|contact)\s*:?$",
    re.I,
)
CONTACT_RE = re.compile(r"(@|https?://|www\.|linkedin|github|\+?\d[\d\s().-]{7,})", re.I)


def word_count(text: str) -> int:
    return len(text.split())


def extract_text(data: bytes, ext: str) -> str:
    try:
        if ext == "pdf":
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted:
                raise CVParseError("Password-protected PDFs can't be read. Please upload an unlocked copy.")
            parts = []
            for i, page in enumerate(reader.pages):
                if i >= MAX_PDF_PAGES:
                    break
                parts.append(page.extract_text() or "")
            text = "\n".join(parts)
        elif ext == "docx":
            doc = Document(io.BytesIO(data))
            text = "\n".join(p.text for p in doc.paragraphs)
        else:
            raise CVParseError("Unsupported CV format. Upload a PDF or DOCX file.")
    except CVParseError:
        raise
    except Exception as exc:
        raise CVParseError("We couldn't read that CV file. Try re-exporting it as a PDF or DOCX.") from exc
    return text


def _clean_lines(text: str) -> list[str]:
    text = re.sub(r"[•●▪◦■►▶✓]", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return [line.strip() for line in text.splitlines() if line.strip()]


def _extract_summary_section(lines: list[str]) -> str | None:
    collected: list[str] = []
    capturing = False
    for line in lines:
        if not capturing:
            inline = HEADING_INLINE_RE.match(line)
            if inline:
                capturing = True
                collected.append(inline.group("rest"))
            elif HEADING_ONLY_RE.match(line):
                capturing = True
            continue
        looks_like_heading = OTHER_HEADING_RE.match(line) or (line.isupper() and word_count(line) <= 4)
        if looks_like_heading:
            break
        collected.append(line)
        if word_count(" ".join(collected)) >= MAX_WORDS * 3:
            break
    return " ".join(collected) if collected else None


def _fallback_body(lines: list[str]) -> str | None:
    # No summary section: take the first prose-like lines, skipping contact info.
    body = [l for l in lines if word_count(l) >= 8 and not CONTACT_RE.search(l)]
    return " ".join(body[:4]) if body else None


def fit_to_word_range(text: str, lo: int = MIN_WORDS, hi: int = MAX_WORDS) -> str | None:
    text = re.sub(r"\s+", " ", text).strip()
    if word_count(text) < lo:
        return None

    out: list[str] = []
    count = 0
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        n = word_count(sentence)
        if count + n > hi:
            break
        out.append(sentence)
        count += n
        if count >= lo:
            return " ".join(out)

    # Couldn't land in range on sentence boundaries — hard-trim to the max.
    trimmed = " ".join(text.split()[:hi]).rstrip(",;:-–—")
    if not trimmed.endswith((".", "!", "?")):
        trimmed += "."
    return trimmed


def build_summary_from_cv(text: str) -> str | None:
    lines = _clean_lines(text)
    raw = _extract_summary_section(lines) or _fallback_body(lines)
    return fit_to_word_range(raw) if raw else None