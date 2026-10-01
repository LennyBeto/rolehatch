# backend/app/services/cv/parser.py
import io
import re

import httpx
from pypdf import PdfReader

from app.schemas.cv import ATSCheck, ATSReport, CVData, CVEntry

MAX_BYTES = 5 * 1024 * 1024
MAX_PAGES = 6

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(?<!\d)\+?\d[\d\s().-]{7,}\d(?!\d)")
URL_RE = re.compile(r"(?:https?://|www\.)\S+|(?:linkedin\.com|github\.com)/\S+", re.I)
BULLET_RE = re.compile(r"^\s*[•●▪■◦·\-–*]\s+")
# Fixed host + validated doc id only -> no user-controlled URL is ever fetched (no SSRF).
GDOC_RE = re.compile(r"^https://docs\.google\.com/document/d/([a-zA-Z0-9_-]{20,})")

SECTION_ALIASES = {
    "summary": {"summary", "professional summary", "professional overview", "overview", "profile", "professional profile", "about", "about me", "objective", "career objective"},
    "experience": {"experience", "work experience", "professional experience", "employment", "employment history", "work history", "career history"},
    "education": {"education", "academic background", "education and training", "academic qualifications", "education and certifications"},
    "skills": {"skills", "technical skills", "core skills", "key skills", "core competencies", "skills and tools", "technologies"},
    "projects": {"projects", "personal projects", "selected projects", "key projects"},
    "certifications": {"certifications", "certificates", "licenses and certifications", "certifications and licenses", "courses", "training"},
}
HEADING_LOOKUP = {a: k for k, aliases in SECTION_ALIASES.items() for a in aliases}


# ── Text extraction ────────────────────────────────────────────────
def extract_pdf_text(data: bytes) -> str:
    if len(data) > MAX_BYTES:
        raise ValueError("File is too large (max 5 MB)")
    if not data.startswith(b"%PDF"):
        raise ValueError("That file isn't a valid PDF")
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ValueError("Password-protected PDFs aren't supported")
        text = "\n".join((p.extract_text() or "") for p in reader.pages[:MAX_PAGES])
    except ValueError:
        raise
    except Exception:
        raise ValueError("Couldn't read this PDF")
    if len(text.strip()) < 50:
        raise ValueError("No readable text found — scanned/image PDFs aren't supported")
    return text


def fetch_google_doc_text(url: str) -> str:
    m = GDOC_RE.match(url)
    if not m:
        raise ValueError("Enter a valid Google Docs link (docs.google.com/document/d/...)")
    export_url = f"https://docs.google.com/document/d/{m.group(1)}/export?format=txt"
    try:
        resp = httpx.get(export_url, follow_redirects=True, timeout=15)
    except httpx.HTTPError:
        raise ValueError("Couldn't reach Google Docs — try again")
    if resp.status_code != 200 or "text/plain" not in resp.headers.get("content-type", ""):
        raise ValueError('Couldn\'t read the doc — set sharing to "Anyone with the link can view"')
    if len(resp.content) > MAX_BYTES:
        raise ValueError("Document is too large")
    text = resp.text
    if len(text.strip()) < 50:
        raise ValueError("The document looks empty")
    return text


# ── Parsing ────────────────────────────────────────────────────────
def _heading_key(line: str) -> str | None:
    cleaned = re.sub(r"[^a-z& ]", "", line.lower()).replace("&", "and")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned or len(cleaned.split()) > 4:
        return None
    return HEADING_LOOKUP.get(cleaned)


def _group_entries(lines: list[str], per_line: bool = False) -> list[CVEntry]:
    """per_line=True: every non-bullet line is its own entry (education/certifications)."""
    entries: list[dict] = []
    cur: dict | None = None
    last_bullet = False
    blank_seen = False
    for raw in lines:
        if not raw:
            blank_seen = True
            continue
        if BULLET_RE.match(raw):
            if cur is None:
                cur = {"lines": [], "bullets": []}
                entries.append(cur)
            cur["bullets"].append(BULLET_RE.sub("", raw))
            last_bullet, blank_seen = True, False
            continue
        # PDF-wrapped bullet continuation
        if last_bullet and cur and cur["bullets"] and raw[:1].islower() and not blank_seen:
            cur["bullets"][-1] += " " + raw
            continue
        # PDF-wrapped line continuation (per-line sections)
        if per_line and cur and cur["lines"] and not cur["bullets"] and raw[:1].islower() and not blank_seen:
            cur["lines"][-1] += " " + raw
            continue
        if cur is None or last_bullet or per_line or (blank_seen and cur["lines"]):
            cur = {"lines": [], "bullets": []}
            entries.append(cur)
        cur["lines"].append(raw)
        last_bullet, blank_seen = False, False
    return [
        CVEntry(lines=[l[:600] for l in e["lines"][:6]], bullets=[b[:600] for b in e["bullets"][:20]])
        for e in entries[:20]
    ]


def _parse_skills(lines: list[str]) -> list[str]:
    items: list[str] = []
    for ln in lines:
        if not ln:
            continue
        ln = BULLET_RE.sub("", ln)
        if ":" in ln:
            ln = ln.split(":", 1)[1]
        # don't split on commas inside parentheses, e.g. "Excel (Pivot Tables, VLOOKUP)"
        items += [s.strip() for s in re.split(r"[,;|•·](?![^(]*\))", ln)]
    seen, out = set(), []
    for s in items:
        if s and len(s) <= 60 and s.lower() not in seen:
            seen.add(s.lower())
            out.append(s)
    return out[:60]


def parse_cv_text(text: str) -> CVData:
    text = text.replace("\ufeff", "").replace("\u00a0", " ").replace("\r", "")
    header: list[str] = []
    sections: dict[str, list[str]] = {k: [] for k in SECTION_ALIASES}
    current = None
    for ln in (l.strip() for l in text.split("\n")):
        key = _heading_key(ln) if ln else None
        if key:
            current = key
            continue
        (header if current is None else sections[current]).append(ln)

    head = [l for l in header if l][:12]
    head_text = "\n".join(head)

    em = EMAIL_RE.search(text)
    email = em.group() if em else ""

    phone = ""
    for m in PHONE_RE.finditer(head_text):
        if 9 <= len(re.sub(r"\D", "", m.group())) <= 15:
            phone = m.group().strip()
            break

    links: list[str] = []
    for u in URL_RE.findall(head_text):
        u = u.rstrip(".,;)")
        if u not in links:
            links.append(u[:600])

    name = ""
    for ln in head[:5]:
        if EMAIL_RE.search(ln) or URL_RE.search(ln) or re.search(r"\d", ln) or len(ln.split()) > 6:
            continue
        name = ln
        break

    location = ""
    for ln in head[1:8]:
        stripped = URL_RE.sub("", EMAIL_RE.sub("", PHONE_RE.sub("", ln)))
        for part in re.split(r"[|·•]", stripped):
            part = part.strip()
            if "," in part and len(part) <= 50 and not re.search(r"\d", part):
                location = part
                break
        if location:
            break

    return CVData(
        name=name[:120], email=email[:255], phone=phone[:40], location=location[:120], links=links[:6],
        summary=" ".join(l for l in sections["summary"] if l)[:2000],
        experience=_group_entries(sections["experience"]),
        education=_group_entries(sections["education"], per_line=True),
        projects=_group_entries(sections["projects"]),
        certifications=_group_entries(sections["certifications"], per_line=True),
        skills=_parse_skills(sections["skills"]),
    )


def ats_report(cv: CVData) -> ATSReport:
    bullets = sum(len(e.bullets) for e in cv.experience)
    checks = [
        ("Name detected", bool(cv.name)),
        ("Email found", bool(cv.email)),
        ("Phone number found", bool(cv.phone)),
        ("Professional summary present", bool(cv.summary)),
        ("Work experience section detected", bool(cv.experience)),
        ("Education section detected", bool(cv.education)),
        ("5+ skills listed", len(cv.skills) >= 5),
        ("3+ achievement bullets", bullets >= 3),
    ]
    passed = sum(ok for _, ok in checks)
    return ATSReport(score=round(100 * passed / len(checks)), checks=[ATSCheck(label=l, passed=ok) for l, ok in checks])