"""Load candidate knowledge base from YAML + profile config."""

from __future__ import annotations

from src.common.config import load_candidate_profile
from src.common.io import load_yaml
from src.common.paths import CANDIDATE_DIR
from src.models.candidate import (
    Achievement,
    CandidateProfile,
    CertificationRecord,
    EducationRecord,
    ProjectRecord,
    SkillRecord,
    VerifiedExperience,
)


def load_candidate_knowledge_base() -> CandidateProfile:
    raw = load_candidate_profile()
    location = raw.get("location") or {}
    education = [
        EducationRecord.model_validate(_normalize_education(e))
        for e in raw.get("education") or []
    ]

    exp_doc = load_yaml(CANDIDATE_DIR / "verified_experience.yaml")
    skills_doc = load_yaml(CANDIDATE_DIR / "skills_inventory.yaml")
    projects_doc = load_yaml(CANDIDATE_DIR / "project_inventory.yaml")
    achievements_doc = load_yaml(CANDIDATE_DIR / "achievements.yaml")
    cert_doc = load_yaml(CANDIDATE_DIR / "certifications.yaml")

    experiences = [VerifiedExperience.model_validate(e) for e in exp_doc.get("experiences") or []]
    skills = [SkillRecord.model_validate(s) for s in skills_doc.get("skills") or []]
    projects = [ProjectRecord.model_validate(p) for p in projects_doc.get("projects") or []]
    achievements = [Achievement.model_validate(a) for a in achievements_doc.get("achievements") or []]
    certifications = [
        CertificationRecord.model_validate(c) for c in (cert_doc.get("certifications") or raw.get("certifications") or [])
    ]

    resume_imported = bool(
        raw.get("resume_imported")
        or exp_doc.get("resume_imported")
        or experiences
        or skills
    )

    return CandidateProfile(
        full_name=raw.get("full_name", "Candidate"),
        preferred_name=raw.get("preferred_name", ""),
        email=raw.get("email"),
        phone=raw.get("phone"),
        location_city=location.get("city", ""),
        location_state=location.get("state", ""),
        location_country=location.get("country", "United States"),
        education=education,
        work_authorization_status=(raw.get("work_authorization") or {}).get("status"),
        target_roles=list(raw.get("target_roles") or []),
        employment_type_preference=raw.get("employment_type_preference", "Full-time"),
        preferred_locations=list(raw.get("preferred_locations") or []),
        career_priorities=list(raw.get("career_priorities") or []),
        years_of_experience_verified=raw.get("years_of_experience_verified"),
        resume_imported=resume_imported,
        profile_reviewed=bool(raw.get("profile_reviewed")),
        profile_approved=bool(raw.get("profile_approved")),
        experiences=experiences,
        skills=skills,
        projects=projects,
        achievements=achievements,
        certifications=certifications,
    )


def _normalize_education(entry: dict) -> dict:
    data = dict(entry)
    if not data.get("source_file") and data.get("source"):
        data["source_file"] = data["source"]
    if not data.get("source_section"):
        data["source_section"] = "education"
    if not data.get("supporting_text"):
        data["supporting_text"] = f"{data.get('degree', '')} — {data.get('institution', '')}"
    return data
