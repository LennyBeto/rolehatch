# backend/app/services/ats_scan.py
import io
import re

EXPERTISE_KEYWORDS: dict[str, list[str]] = {
    "frontend_engineer": ["react", "javascript", "typescript", "css", "html", "vue", "next.js", "redux", "responsive", "ui"],
    "backend_engineer": ["python", "django", "fastapi", "node.js", "java", "sql", "api", "microservices", "postgresql", "rest"],
    "fullstack_engineer": ["react", "node.js", "python", "javascript", "sql", "api", "docker", "aws", "git"],
    "devops_engineer": ["docker", "kubernetes", "terraform", "ci/cd", "aws", "gcp", "azure", "jenkins", "ansible"],
    "data_scientist": ["python", "pandas", "numpy", "machine learning", "tensorflow", "pytorch", "sql", "statistics"],
    "data_analyst": ["sql", "excel", "tableau", "power bi", "python", "data visualization", "reporting"],
    "product_manager": ["roadmap", "stakeholder", "agile", "scrum", "user stories", "kpi", "product strategy"],
    "ui_ux_designer": ["figma", "sketch", "wireframe", "prototype", "user research", "usability", "design system"],
    "qa_engineer": ["testing", "selenium", "test cases", "automation", "qa", "bug tracking", "regression"],
    "mobile_engineer": ["swift", "kotlin", "react native", "flutter", "ios", "android", "mobile"],
    "cybersecurity_engineer": ["security", "penetration testing", "vulnerability", "firewall", "encryption", "compliance"],
    "other": [],
}

ACTION_VERBS = [
    "led", "built", "developed", "designed", "implemented", "managed",
    "improved", "launched", "created", "optimized",
]


def extract_text(content_type: str, raw_bytes: bytes) -> str:
    if content_type == "application/pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(raw_bytes))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception:
            return ""
    if content_type == "text/plain":
        try:
            return raw_bytes.decode("utf-8", errors="ignore")
        except Exception:
            return ""
    if content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        try:
            import docx
            doc = docx.Document(io.BytesIO(raw_bytes))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            return ""
    return ""


def score_cv(text: str, expertise: str | None) -> tuple[int, dict[str, int], list[str]]:
    text_lower = text.lower()
    breakdown: dict[str, int] = {}
    suggestions: list[str] = []

    # Contact info
    has_email = bool(re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text))
    has_phone = bool(re.search(r"(\+?\d[\d\s\-().]{7,}\d)", text))
    contact_score = 100 if (has_email and has_phone) else 50 if (has_email or has_phone) else 0
    breakdown["contact_info"] = contact_score
    if contact_score < 100:
        suggestions.append("Add both an email address and phone number near the top of your CV.")

    # Key sections
    sections = ["experience", "education", "skills"]
    found_sections = sum(1 for s in sections if s in text_lower)
    section_score = int((found_sections / len(sections)) * 100)
    breakdown["key_sections"] = section_score
    if found_sections < len(sections):
        missing = [s for s in sections if s not in text_lower]
        suggestions.append(f"Add clearly labeled sections for: {', '.join(missing)}.")

    # Length
    word_count = len(text.split())
    if 300 <= word_count <= 1200:
        length_score = 100
    elif word_count < 300:
        length_score = max(0, int((word_count / 300) * 100))
        suggestions.append("Your CV looks short — consider adding more detail on your experience.")
    else:
        length_score = max(0, 100 - int((word_count - 1200) / 20))
        suggestions.append("Your CV is quite long — consider trimming to the most relevant experience.")
    breakdown["length"] = max(0, min(100, length_score))

    # Keyword match against expertise
    keywords = EXPERTISE_KEYWORDS.get(expertise or "other", [])
    if keywords:
        matched = sum(1 for kw in keywords if kw in text_lower)
        keyword_score = int((matched / len(keywords)) * 100)
        breakdown["keyword_match"] = keyword_score
        if keyword_score < 50:
            suggestions.append("Include more role-specific keywords and tools relevant to your expertise.")
    else:
        breakdown["keyword_match"] = 70  # neutral baseline when no mapping is available

    # Action verbs
    verb_hits = sum(1 for v in ACTION_VERBS if v in text_lower)
    action_score = min(100, verb_hits * 20)
    breakdown["action_verbs"] = action_score
    if action_score < 60:
        suggestions.append("Use more action verbs (e.g. 'built', 'led', 'improved') to describe your achievements.")

    weights = {
        "contact_info": 0.15,
        "key_sections": 0.25,
        "length": 0.15,
        "keyword_match": 0.30,
        "action_verbs": 0.15,
    }
    overall = round(sum(breakdown[k] * weights[k] for k in weights))
    return overall, breakdown, suggestions