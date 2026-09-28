# backend/app/services/ats_scoring.py
import re

CONTACT_EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
CONTACT_PHONE_RE = re.compile(r"(\+?\d[\d\-\s()]{7,}\d)")

SECTION_KEYWORDS = ["experience", "education", "skills"]

ACTION_VERBS = [
    "led", "built", "managed", "developed", "designed", "implemented",
    "improved", "created", "launched", "optimized", "architected",
    "delivered", "reduced", "increased", "automated", "migrated",
]

# Same tech vocabulary the scraper pipeline tags listings with (see
# app/services/pipeline.py TECH_KEYWORDS), so a CV's keyword-match score
# lines up with how job listings themselves get tagged.
TECH_KEYWORDS = [
    "python", "django", "fastapi", "flask", "javascript", "typescript",
    "react", "next.js", "vue", "node.js", "java", "go", "golang", "rust",
    "c#", ".net", "postgresql", "postgres", "mysql", "mongodb", "redis",
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "graphql",
    "rest api", "sql", "swift", "kotlin", "ruby", "rails", "php", "laravel",
]


def _score_contact_info(text: str) -> int:
    has_email = bool(CONTACT_EMAIL_RE.search(text))
    has_phone = bool(CONTACT_PHONE_RE.search(text))
    if has_email and has_phone:
        return 100
    if has_email or has_phone:
        return 50
    return 0


def _score_key_sections(text_lower: str) -> int:
    found = sum(1 for kw in SECTION_KEYWORDS if kw in text_lower)
    return round(found / len(SECTION_KEYWORDS) * 100)


def _score_length(text: str) -> int:
    word_count = len(text.split())
    if 300 <= word_count <= 900:
        return 100
    if 150 <= word_count < 300 or 900 < word_count <= 1200:
        return 70
    if word_count == 0:
        return 0
    return 40


def _score_keyword_match(text_lower: str) -> int:
    found = sum(1 for kw in TECH_KEYWORDS if kw in text_lower)
    return min(round(found / 6 * 100), 100)  # 6+ distinct tech keywords = strong match


def _score_action_verbs(text_lower: str) -> int:
    found = sum(1 for verb in ACTION_VERBS if re.search(rf"\b{verb}\b", text_lower))
    return min(round(found / 5 * 100), 100)


def compute_ats_score(cv_text: str) -> dict:
    text_lower = cv_text.lower()

    breakdown = {
        "contact_info": _score_contact_info(cv_text),
        "key_sections": _score_key_sections(text_lower),
        "length": _score_length(cv_text),
        "keyword_match": _score_keyword_match(text_lower),
        "action_verbs": _score_action_verbs(text_lower),
    }
    overall_score = round(sum(breakdown.values()) / len(breakdown))

    suggestions = []
    if breakdown["contact_info"] < 100:
        suggestions.append("Add both an email address and phone number so recruiters and ATS parsers can reach you.")
    if breakdown["key_sections"] < 100:
        suggestions.append("Make sure your CV has clearly labeled Experience, Education, and Skills sections.")
    if breakdown["length"] < 100:
        word_count = len(cv_text.split())
        if word_count < 300:
            suggestions.append("Your CV looks short — consider expanding on your experience and achievements.")
        else:
            suggestions.append("Your CV is on the longer side — consider trimming to the most relevant experience.")
    if breakdown["keyword_match"] < 60:
        suggestions.append("Add more specific technologies and tools you've used to match common job listing keywords.")
    if breakdown["action_verbs"] < 60:
        suggestions.append("Use more action verbs (e.g. 'built', 'led', 'optimized') to describe your accomplishments.")

    return {"overall_score": overall_score, "breakdown": breakdown, "suggestions": suggestions}