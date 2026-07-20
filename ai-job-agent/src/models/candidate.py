"""Candidate knowledge-base schemas."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Confidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ClaimType(str, Enum):
    VERIFIED_FACT = "verified_fact"
    REASONABLE_REFRAMING = "reasonable_reframing"
    UNSUPPORTED = "unsupported"


class ClaimItem(BaseModel):
    text: str
    confidence: Confidence = Confidence.HIGH
    can_include_in_resume: bool = True
    claim_type: ClaimType = ClaimType.VERIFIED_FACT
    supporting_text: str = ""
    source_file: str = ""


class VerifiedExperience(BaseModel):
    id: str
    employer: str
    role: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    technologies: list[str] = Field(default_factory=list)
    responsibilities: list[ClaimItem] = Field(default_factory=list)
    measurable_results: list[ClaimItem] = Field(default_factory=list)
    industry_domain: Optional[str] = None
    confidence: Confidence = Confidence.HIGH
    can_include_in_resume: bool = True
    source_file: str = ""


class SkillRecord(BaseModel):
    name: str
    category: str = "other"
    proficiency: Optional[str] = None
    source_file: str = ""
    supporting_text: str = ""
    confidence: Confidence = Confidence.HIGH
    can_include_in_resume: bool = True
    claim_type: ClaimType = ClaimType.VERIFIED_FACT
    years_used: Optional[float] = None
    contexts: list[str] = Field(default_factory=list)


class ProjectRecord(BaseModel):
    id: str
    name: str
    role: Optional[str] = None
    dates: Optional[str] = None
    technologies: list[str] = Field(default_factory=list)
    description: str = ""
    measurable_results: list[ClaimItem] = Field(default_factory=list)
    source_file: str = ""
    supporting_text: str = ""
    confidence: Confidence = Confidence.HIGH
    can_include_in_resume: bool = True
    claim_type: ClaimType = ClaimType.VERIFIED_FACT
    industry_domain: Optional[str] = None


class Achievement(BaseModel):
    id: str
    text: str
    metric: Optional[str] = None
    related_experience_id: Optional[str] = None
    related_project_id: Optional[str] = None
    source_file: str = ""
    supporting_text: str = ""
    confidence: Confidence = Confidence.HIGH
    can_include_in_resume: bool = True
    claim_type: ClaimType = ClaimType.VERIFIED_FACT


class EducationRecord(BaseModel):
    degree: str
    institution: str
    location: Optional[str] = None
    graduation_date: Optional[str] = None
    gpa: Optional[str] = None
    source: str = ""
    confidence: Confidence = Confidence.HIGH


class CandidateProfile(BaseModel):
    full_name: str
    preferred_name: str = ""
    email: Optional[str] = None
    phone: Optional[str] = None
    location_city: str = ""
    location_state: str = ""
    location_country: str = "United States"
    education: list[EducationRecord] = Field(default_factory=list)
    work_authorization_status: Optional[str] = None
    target_roles: list[str] = Field(default_factory=list)
    employment_type_preference: str = "Full-time"
    preferred_locations: list[str] = Field(default_factory=list)
    career_priorities: list[str] = Field(default_factory=list)
    years_of_experience_verified: Optional[float] = None
    resume_imported: bool = False
    experiences: list[VerifiedExperience] = Field(default_factory=list)
    skills: list[SkillRecord] = Field(default_factory=list)
    projects: list[ProjectRecord] = Field(default_factory=list)
    achievements: list[Achievement] = Field(default_factory=list)

    @property
    def verified_skill_names(self) -> set[str]:
        return {
            s.name.lower()
            for s in self.skills
            if s.can_include_in_resume and s.claim_type != ClaimType.UNSUPPORTED
        }

    @property
    def verified_technologies(self) -> set[str]:
        techs: set[str] = set(self.verified_skill_names)
        for exp in self.experiences:
            techs.update(t.lower() for t in exp.technologies)
        for proj in self.projects:
            techs.update(t.lower() for t in proj.technologies)
        return techs
