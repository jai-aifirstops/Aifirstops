"""Tests for claims verification boundaries and tracker safety."""

from pathlib import Path

import pytest

from src.common.resume_import import import_resume
from src.models.candidate import ClaimType
from src.resume_tailoring.tailor import ResumeTailor
from src.job_parser.parser import parse_job_dict
from src.matching.scorer import MatchScorer
from src.models.candidate import CandidateProfile, EducationRecord, SkillRecord, VerifiedExperience, ClaimItem
from src.tracking.tracker import ApplicationTracker


def test_import_resume_extracts_verified_skills(tmp_path: Path):
    fixture = Path(__file__).parent / "fixtures" / "sample_resume.md"
    # Import into temp copies by monkeypatching destinations would be heavy;
    # instead parse via import_resume dry-run and a local copy write path through dry_run.
    result = import_resume(fixture, dry_run=True)
    assert result["skills_found"] >= 5
    assert result["experiences_found"] >= 1
    assert result["projects_found"] >= 1


def test_tailor_refuses_below_75():
    profile = CandidateProfile(
        full_name="Jai deep Ponnam",
        education=[EducationRecord(degree="MS CS", institution="University of Memphis")],
        resume_imported=True,
        skills=[SkillRecord(name="Python")],
    )
    job = parse_job_dict({"title": "AI Engineer", "company": "Acme", "description": "Python LLM"})
    report = MatchScorer(profile).score(job)
    report.match_score = 70
    with pytest.raises(ValueError):
        ResumeTailor(profile, output_dir=Path("/tmp/resume_test_out")).tailor(job, report)


def test_unsupported_claims_not_in_resume(tmp_path: Path):
    profile = CandidateProfile(
        full_name="Jai deep Ponnam",
        preferred_name="Jai",
        location_city="Austin",
        location_state="Texas",
        education=[EducationRecord(degree="MS CS", institution="University of Memphis")],
        resume_imported=True,
        skills=[SkillRecord(name="Python", claim_type=ClaimType.VERIFIED_FACT)],
        experiences=[
            VerifiedExperience(
                id="exp_001",
                employer="Example Labs",
                role="Intern",
                start_date="2023",
                end_date="2023",
                responsibilities=[
                    ClaimItem(text="Built Python APIs", claim_type=ClaimType.VERIFIED_FACT),
                    ClaimItem(
                        text="Invented quantum LLM chip",
                        claim_type=ClaimType.UNSUPPORTED,
                        can_include_in_resume=False,
                    ),
                ],
            )
        ],
    )
    job = parse_job_dict(
        {
            "title": "AI Engineer",
            "company": "Acme AI",
            "location": "Austin, TX",
            "description": "Python FastAPI LLM RAG production AWS",
            "technology_stack": ["Python", "FastAPI", "LLM"],
            "required_qualifications": ["Python"],
            "experience_years_min": 0,
        }
    )
    report = MatchScorer(profile).score(job)
    report.match_score = 80
    result = ResumeTailor(profile, output_dir=tmp_path).tailor(job, report)
    text = Path(result["resume_path"]).read_text(encoding="utf-8")
    assert "Built Python APIs" in text
    assert "quantum LLM chip" not in text


def test_tracker_refuses_applied_without_confirmation(tmp_path: Path):
    tracker = ApplicationTracker(path=tmp_path / "tracker.csv")
    tracker.upsert(
        {
            "job_id": "abc",
            "company": "Acme",
            "job_title": "AI Engineer",
            "application_status": "Ready to Apply",
        }
    )
    with pytest.raises(PermissionError):
        tracker.update_status("abc", "Applied")
    row = tracker.update_status("abc", "Applied", user_confirmed_submission=True, date_applied="2026-07-20")
    assert row["application_status"] == "Applied"
