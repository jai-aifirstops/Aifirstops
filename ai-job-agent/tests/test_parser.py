"""Tests for job parsing."""

from src.job_parser.parser import parse_job_dict


def test_parse_basic_job():
    job = parse_job_dict(
        {
            "title": "AI Engineer",
            "company": "Acme",
            "location": "Remote, United States",
            "description": "Build LLM apps with Python and FastAPI. 2-4 years experience. Sponsorship available.",
            "required_qualifications": ["Python", "LLMs"],
        }
    )
    assert job.title == "AI Engineer"
    assert job.company == "Acme"
    assert job.work_arrangement.value == "remote"
    assert job.experience_years_min == 2
    assert job.experience_years_max == 4
    assert "Python" in job.technology_stack
    assert job.sponsorship_language or job.work_authorization_language


def test_parse_generates_stable_id():
    a = parse_job_dict({"title": "ML Engineer", "company": "X", "url": "https://x.example/1"})
    b = parse_job_dict({"title": "ML Engineer", "company": "X", "url": "https://x.example/1"})
    assert a.job_id == b.job_id
