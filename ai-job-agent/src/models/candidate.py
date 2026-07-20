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


class VerificationStatus(str, Enum):
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    CORRECTED = "corrected"
    REJECTED = "rejected"
    PRIVATE = "private"


class ProvenanceMixin(BaseModel):
    """Common provenance fields required on every extracted fact."""

    source_file: str = ""
    source_section: str = ""
    supporting_text: str = ""
    confidence: Confidence = Confidence.MEDIUM
    verification_status: VerificationStatus = VerificationStatus.PENDING_REVIEW
    can_include_in_resume: bool = True
    is_private: bool = False
    claim_type: ClaimType = ClaimType.VERIFIED_FACT
    requires_user_confirmation: bool = False
    confirmation_reason: Optional[str] = None


class ClaimItem(ProvenanceMixin):
    text: str
    metric: Optional[str] = None


class VerifiedExperience(ProvenanceMixin):
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


class SkillRecord(ProvenanceMixin):
    name: str
    category: str = "other"
    proficiency: Optional[str] = None
    years_used: Optional[float] = None
    contexts: list[str] = Field(default_factory=list)


class ProjectRecord(ProvenanceMixin):
    id: str
    name: str
    role: Optional[str] = None
    dates: Optional[str] = None
    technologies: list[str] = Field(default_factory=list)
    description: str = ""
    measurable_results: list[ClaimItem] = Field(default_factory=list)
    industry_domain: Optional[str] = None


class Achievement(ProvenanceMixin):
    id: str
    text: str
    metric: Optional[str] = None
    related_experience_id: Optional[str] = None
    related_project_id: Optional[str] = None


class CertificationRecord(ProvenanceMixin):
    id: str
    name: str
    issuer: Optional[str] = None
    date: Optional[str] = None


class EducationRecord(ProvenanceMixin):
    degree: str
    institution: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    graduation_date: Optional[str] = None
    gpa: Optional[str] = None
    # Backward-compatible alias used in older YAML
    source: str = ""


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
    profile_reviewed: bool = False
    profile_approved: bool = False
    experiences: list[VerifiedExperience] = Field(default_factory=list)
    skills: list[SkillRecord] = Field(default_factory=list)
    projects: list[ProjectRecord] = Field(default_factory=list)
    achievements: list[Achievement] = Field(default_factory=list)
    certifications: list[CertificationRecord] = Field(default_factory=list)

    @property
    def is_ready_for_tailoring(self) -> bool:
        return bool(
            self.resume_imported
            and self.profile_reviewed
            and self.profile_approved
            and self.experiences
        )

    @property
    def verified_skill_names(self) -> set[str]:
        return {
            s.name.lower()
            for s in self.skills
            if s.can_include_in_resume
            and not s.is_private
            and s.claim_type != ClaimType.UNSUPPORTED
            and s.verification_status
            in {
                VerificationStatus.APPROVED,
                VerificationStatus.CORRECTED,
                VerificationStatus.PENDING_REVIEW,
            }
        }

    @property
    def verified_technologies(self) -> set[str]:
        techs: set[str] = set(self.verified_skill_names)
        for exp in self.experiences:
            if exp.is_private or exp.verification_status == VerificationStatus.REJECTED:
                continue
            techs.update(t.lower() for t in exp.technologies)
        for proj in self.projects:
            if proj.is_private or proj.verification_status == VerificationStatus.REJECTED:
                continue
            techs.update(t.lower() for t in proj.technologies)
        return techs
