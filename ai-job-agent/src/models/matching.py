"""Match scoring and analysis report schemas."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class MatchClassification(str, Enum):
    EXCEPTIONAL = "Exceptional match"
    STRONG = "Strong match"
    POSSIBLE = "Possible match"
    LOW_PRIORITY = "Low-priority stretch"
    SKIP = "Skip"
    REJECTED = "Rejected"


class RequirementStatus(str, Enum):
    FULLY_MATCHED = "fully_matched"
    PARTIALLY_MATCHED = "partially_matched"
    TRANSFERABLE = "transferable"
    MISSING_LEARNABLE = "missing_but_learnable"
    MISSING_DISQUALIFYING = "missing_and_potentially_disqualifying"


class RequirementMatch(BaseModel):
    requirement: str
    status: RequirementStatus
    evidence: str = ""
    notes: str = ""


class ScoreBreakdown(BaseModel):
    core_technical_skills: float = 0.0
    relevant_experience: float = 0.0
    ai_ml_llm_relevance: float = 0.0
    seniority_alignment: float = 0.0
    education_alignment: float = 0.0
    location_arrangement: float = 0.0
    industry_interest: float = 0.0
    career_growth: float = 0.0
    application_practicality: float = 0.0
    penalties: float = 0.0
    penalty_reasons: list[str] = Field(default_factory=list)

    @property
    def total_before_penalties(self) -> float:
        return (
            self.core_technical_skills
            + self.relevant_experience
            + self.ai_ml_llm_relevance
            + self.seniority_alignment
            + self.education_alignment
            + self.location_arrangement
            + self.industry_interest
            + self.career_growth
            + self.application_practicality
        )

    @property
    def total(self) -> float:
        return max(0.0, min(100.0, self.total_before_penalties + self.penalties))


class MatchReport(BaseModel):
    job_id: str
    company: str
    title: str
    match_score: float
    classification: MatchClassification
    rejected: bool = False
    rejection_reason: Optional[str] = None
    executive_recommendation: str = ""
    why_fits: list[str] = Field(default_factory=list)
    strongest_qualifications: list[str] = Field(default_factory=list)
    missing_required: list[str] = Field(default_factory=list)
    missing_preferred: list[str] = Field(default_factory=list)
    transferable_skills: list[str] = Field(default_factory=list)
    resume_changes_needed: list[str] = Field(default_factory=list)
    keywords_to_include: list[str] = Field(default_factory=list)
    potential_concerns: list[str] = Field(default_factory=list)
    work_authorization_language: Optional[str] = None
    sponsorship_language: Optional[str] = None
    likely_interview_topics: list[str] = Field(default_factory=list)
    application_priority: str = "Research further"
    referral_would_help: bool = False
    requirement_matches: list[RequirementMatch] = Field(default_factory=list)
    score_breakdown: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    assumptions: list[str] = Field(default_factory=list)
