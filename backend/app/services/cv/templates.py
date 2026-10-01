# backend/app/services/cv/templates.py
# All templates follow ATS-safe rules: single column, real selectable text,
# standard section headings, standard fonts, no tables/images/icons/text boxes.

SECTION_LABELS = {
    "summary": "Professional Summary",
    "experience": "Work Experience",
    "education": "Education",
    "skills": "Skills",
    "projects": "Projects",
    "certifications": "Certifications",
}

TEMPLATES = {
    "classic": {
        "name": "Classic",
        "description": "Centered header, serif type, ruled headings. Safe default for any industry.",
        "fonts": ("Times-Roman", "Times-Bold", "Times-Italic"), "font_family": "serif",
        "base": 10.5, "name_size": 20, "align": "center", "accent": "#111111",
        "caps": True, "rule": True, "gap": 9, "margin": 0.8,
        "order": ["summary", "experience", "education", "skills", "projects", "certifications"],
    },
    "modern": {
        "name": "Modern",
        "description": "Clean sans-serif, left-aligned, subtle teal accent. Great for tech and startups.",
        "fonts": ("Helvetica", "Helvetica-Bold", "Helvetica-Oblique"), "font_family": "sans",
        "base": 10, "name_size": 22, "align": "left", "accent": "#1F4E5F",
        "caps": True, "rule": True, "gap": 9, "margin": 0.75,
        "order": ["summary", "experience", "projects", "skills", "education", "certifications"],
    },
    "compact": {
        "name": "Compact",
        "description": "Tight spacing to fit long histories on one or two pages.",
        "fonts": ("Helvetica", "Helvetica-Bold", "Helvetica-Oblique"), "font_family": "sans",
        "base": 9.5, "name_size": 18, "align": "left", "accent": "#222222",
        "caps": True, "rule": False, "gap": 6, "margin": 0.6,
        "order": ["summary", "experience", "education", "skills", "projects", "certifications"],
    },
    "technical": {
        "name": "Technical",
        "description": "Skills up front, then projects. Built for engineers and data roles.",
        "fonts": ("Helvetica", "Helvetica-Bold", "Helvetica-Oblique"), "font_family": "sans",
        "base": 10, "name_size": 21, "align": "left", "accent": "#2F4F3F",
        "caps": True, "rule": True, "gap": 8, "margin": 0.7,
        "order": ["summary", "skills", "projects", "experience", "education", "certifications"],
    },
    "executive": {
        "name": "Executive",
        "description": "Spacious serif layout leading with experience. Suited to senior and leadership roles.",
        "fonts": ("Times-Roman", "Times-Bold", "Times-Italic"), "font_family": "serif",
        "base": 11, "name_size": 24, "align": "left", "accent": "#1D3025",
        "caps": False, "rule": True, "gap": 12, "margin": 0.9,
        "order": ["summary", "experience", "education", "certifications", "skills", "projects"],
    },
}


def public_template(template_id: str) -> dict:
    t = TEMPLATES[template_id]
    return {
        "id": template_id, "name": t["name"], "description": t["description"],
        "font_family": t["font_family"], "align": t["align"], "accent": t["accent"],
        "caps": t["caps"], "rule": t["rule"], "order": t["order"], "labels": SECTION_LABELS,
        "base": t["base"], "name_size": t["name_size"], "gap": t["gap"], "margin": t["margin"],
    }