# backend/app/schemas/cv.py
from typing import Annotated
from pydantic import BaseModel, Field, StringConstraints

Line = Annotated[str, StringConstraints(max_length=600, strip_whitespace=True)]


class CVEntry(BaseModel):
    lines: list[Line] = Field(default_factory=list, max_length=6)
    bullets: list[Line] = Field(default_factory=list, max_length=20)


class CVData(BaseModel):
    name: Annotated[str, StringConstraints(max_length=120, strip_whitespace=True)] = ""
    email: Annotated[str, StringConstraints(max_length=255, strip_whitespace=True)] = ""
    phone: Annotated[str, StringConstraints(max_length=40, strip_whitespace=True)] = ""
    location: Annotated[str, StringConstraints(max_length=120, strip_whitespace=True)] = ""
    links: list[Line] = Field(default_factory=list, max_length=6)
    summary: Annotated[str, StringConstraints(max_length=2000, strip_whitespace=True)] = ""
    experience: list[CVEntry] = Field(default_factory=list, max_length=20)
    education: list[CVEntry] = Field(default_factory=list, max_length=20)
    projects: list[CVEntry] = Field(default_factory=list, max_length=20)
    certifications: list[CVEntry] = Field(default_factory=list, max_length=20)
    skills: list[Annotated[str, StringConstraints(max_length=60, strip_whitespace=True)]] = Field(
        default_factory=list, max_length=60
    )


class ATSCheck(BaseModel):
    label: str
    passed: bool


class ATSReport(BaseModel):
    score: int
    checks: list[ATSCheck]


class ParseResponse(BaseModel):
    cv: CVData
    ats: ATSReport


class RenderRequest(BaseModel):
    template_id: str
    cv: CVData