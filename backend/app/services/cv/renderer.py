# backend/app/services/cv/renderer.py
import io
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

from app.schemas.cv import CVData
from app.services.cv.templates import SECTION_LABELS, TEMPLATES

ENTRY_KEYS = ("experience", "education", "projects", "certifications")
_REPL = {"\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u2013": "-", "\u2014": "-", "\u2022": "-", "\u2026": "...", "\u00a0": " "}


def _safe(s: str) -> str:
    # Standard PDF fonts are WinAnsi only; normalise punctuation, drop unsupported glyphs.
    for k, v in _REPL.items():
        s = s.replace(k, v)
    return s.encode("cp1252", "ignore").decode("cp1252")


def _p(text: str, style: ParagraphStyle, **kw) -> Paragraph:
    return Paragraph(escape(_safe(text)), style, **kw)


def _styles(t: dict) -> dict[str, ParagraphStyle]:
    f, fb, fi = t["fonts"]
    b = t["base"]
    accent = colors.HexColor(t["accent"])
    align = TA_CENTER if t["align"] == "center" else TA_LEFT
    lead = b * 1.3
    return {
        "name": ParagraphStyle("name", fontName=fb, fontSize=t["name_size"], leading=t["name_size"] * 1.2, alignment=align, textColor=accent, spaceAfter=2),
        "contact": ParagraphStyle("contact", fontName=f, fontSize=b - 0.5, leading=b + 2, alignment=align, spaceAfter=4),
        "heading": ParagraphStyle("heading", fontName=fb, fontSize=b + 1.5, leading=b + 4, textColor=accent, spaceBefore=t["gap"], spaceAfter=2, keepWithNext=1),
        "body": ParagraphStyle("body", fontName=f, fontSize=b, leading=lead),
        "title": ParagraphStyle("title", fontName=fb, fontSize=b, leading=lead, spaceBefore=4, keepWithNext=1),
        "sub": ParagraphStyle("sub", fontName=fi, fontSize=b, leading=lead, keepWithNext=1),
        "bullet": ParagraphStyle("bullet", fontName=f, bulletFontName=f, fontSize=b, leading=lead, leftIndent=14, bulletIndent=4),
    }


def render_pdf(cv: CVData, template_id: str) -> bytes:
    t = TEMPLATES[template_id]
    S = _styles(t)
    accent = colors.HexColor(t["accent"])
    buf = io.BytesIO()
    m = t["margin"] * inch
    doc = SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=m, rightMargin=m, topMargin=m * 0.8, bottomMargin=m * 0.8,
        title=_safe(f"{cv.name} - CV" if cv.name else "CV"), author=_safe(cv.name),
    )

    story: list = []
    if cv.name:
        story.append(_p(cv.name, S["name"]))
    contact = " | ".join(x for x in [cv.email, cv.phone, cv.location, *cv.links] if x)
    if contact:
        story.append(_p(contact, S["contact"]))

    def section(key: str, flowables: list):
        label = SECTION_LABELS[key]
        story.append(_p(label.upper() if t["caps"] else label, S["heading"]))
        if t["rule"]:
            story.append(HRFlowable(width="100%", thickness=0.6, color=accent, spaceBefore=0, spaceAfter=4))
        story.extend(flowables)

    for key in t["order"]:
        if key == "summary" and cv.summary:
            section(key, [_p(cv.summary, S["body"])])
        elif key == "skills" and cv.skills:
            section(key, [_p(", ".join(cv.skills), S["body"])])
        elif key in ENTRY_KEYS and getattr(cv, key):
            items: list = []
            for e in getattr(cv, key):
                for i, line in enumerate(e.lines):
                    items.append(_p(line, S["title"] if i == 0 else S["sub"]))
                items += [Paragraph(escape(_safe(b)), S["bullet"], bulletText="\u2022") for b in e.bullets]
                items.append(Spacer(1, 2))
            section(key, items)

    if not story:
        story.append(_p("No content", S["body"]))
    doc.build(story)
    return buf.getvalue()