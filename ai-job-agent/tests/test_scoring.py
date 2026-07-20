"""Tests for match scoring and hard rejects."""

from src.job_parser.parser import parse_job_dict
from src.matching.scorer import MatchScorer, classify_score
from src.models.candidate import CandidateProfile, EducationRecord, SkillRecord


def _profile_with_skills() -> CandidateProfile:
    return CandidateProfile(
        full_name="Jai deep Ponnam",
        preferred_name="Jai",
        location_city="Austin",
        location_state="Texas",
        education=[
            EducationRecord(
                degree="Master of Science in Computer Science",
                institution="University of Memphis",
                confidence="high",
            )
        ],
        work_authorization_status="STEM OPT",
        target_roles=["AI Engineer"],
        resume_imported=True,
        years_of_experience_verified=1.0,
        skills=[
            SkillRecord(name="Python", confidence="high"),
            SkillRecord(name="FastAPI", confidence="high"),
            SkillRecord(name="AWS", confidence="medium"),
            SkillRecord(name="Machine Learning", confidence="medium"),
        ],
    )


def test_classify_boundaries():
    assert classify_score(90).value == "Exceptional match"
    assert classify_score(80).value == "Strong match"
    assert classify_score(70).value == "Possible match"
    assert classify_score(55).value == "Low-priority stretch"
    assert classify_score(40).value == "Skip"


def test_reject_citizenship_clearance():
    job = parse_job_dict(
        {
            "title": "Machine Learning Engineer",
            "company": "SecureCo",
            "description": "Must be a U.S. citizen. Active security clearance required.",
            "citizenship_or_clearance_language": "Must be a U.S. citizen.",
        }
    )
    report = MatchScorer(_profile_with_skills()).score(job)
    assert report.rejected
    assert report.match_score == 0


def test_reject_staff_title():
    job = parse_job_dict(
        {
            "title": "Staff Machine Learning Engineer",
            "company": "Mega",
            "description": "Lead ML platform. 10+ years.",
        }
    )
    report = MatchScorer(_profile_with_skills()).score(job)
    assert report.rejected


def test_strong_ai_role_scores_well():
    job = parse_job_dict(
        {
            "title": "AI Engineer",
            "company": "Acme AI",
            "location": "Austin, TX",
            "work_arrangement": "hybrid",
            "description": (
                "Build production LLM and RAG systems with Python FastAPI on AWS. "
                "0-3 years. Master's in Computer Science preferred."
            ),
            "required_qualifications": ["Python", "LLMs", "Master's in Computer Science"],
            "technology_stack": ["Python", "FastAPI", "AWS", "RAG", "LLM"],
            "experience_years_min": 0,
            "experience_years_max": 3,
            "education_requirement": "Master's in Computer Science preferred",
        }
    )
    report = MatchScorer(_profile_with_skills()).score(job)
    assert not report.rejected
    assert report.match_score >= 65


def test_sponsorship_unclear_not_rejected():
    job = parse_job_dict(
        {
            "title": "Backend Engineer, AI Platform",
            "company": "Cloudify",
            "location": "Remote, United States",
            "description": "Python APIs for generative AI. Sponsorship not mentioned.",
            "required_qualifications": ["Python", "REST APIs"],
        }
    )
    report = MatchScorer(_profile_with_skills()).score(job)
    assert not report.rejected
    assert any("sponsorship" in c.lower() or "authorization" in c.lower() for c in report.potential_concerns)
