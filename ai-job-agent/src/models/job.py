"""Job posting schema."""

from __future__ import annotations

from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class WorkArrangement(str, Enum):
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"
    UNKNOWN = "unknown"


class EmploymentType(str, Enum):
    FULL_TIME = "Full-time"
    PART_TIME = "Part-time"
    CONTRACT = "Contract"
    INTERNSHIP = "Internship"
    UNKNOWN = "Unknown"


class JobPosting(BaseModel):
    job_id: str
    title: str
    company: str
    location: str = ""
    work_arrangement: WorkArrangement = WorkArrangement.UNKNOWN
    employment_type: EmploymentType = EmploymentType.UNKNOWN
    salary_range: Optional[str] = None
    posting_date: Optional[date] = None
    original_url: str = ""
    application_url: str = ""
    description: str = ""
    required_qualifications: list[str] = Field(default_factory=list)
    preferred_qualifications: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    technology_stack: list[str] = Field(default_factory=list)
    experience_years_min: Optional[float] = None
    experience_years_max: Optional[float] = None
    education_requirement: Optional[str] = None
    work_authorization_language: Optional[str] = None
    sponsorship_language: Optional[str] = None
    citizenship_or_clearance_language: Optional[str] = None
    source: str = "manual"
    date_discovered: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    application_deadline: Optional[date] = None
    is_expired: bool = False
    is_staffing_repost: bool = False
    company_verified: bool = True
    raw_text: str = ""

    @field_validator("job_id")
    @classmethod
    def nonempty_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("job_id must be non-empty")
        return v.strip()

    def searchable_text(self) -> str:
        parts = [
            self.title,
            self.company,
            self.description,
            " ".join(self.required_qualifications),
            " ".join(self.preferred_qualifications),
            " ".join(self.responsibilities),
            " ".join(self.technology_stack),
            self.raw_text,
            self.work_authorization_language or "",
            self.sponsorship_language or "",
            self.citizenship_or_clearance_language or "",
        ]
        return "\n".join(parts).lower()
