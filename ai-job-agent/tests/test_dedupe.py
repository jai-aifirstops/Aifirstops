"""Tests for deduplication."""

from src.job_discovery.dedupe import Deduplicator
from src.job_parser.parser import parse_job_dict


def test_dedupe_prefers_direct_source():
    a = parse_job_dict(
        {
            "job_id": "1",
            "title": "AI Engineer",
            "company": "Acme AI",
            "location": "Austin, TX",
            "description": "Build production LLM applications with Python FastAPI and RAG evaluation on AWS.",
            "application_url": "https://careers.acme.example/ai",
            "source": "fixture",
        }
    )
    b = parse_job_dict(
        {
            "job_id": "2",
            "title": "AI Engineer",
            "company": "Acme AI Inc",
            "location": "Austin, Texas",
            "description": "Build production LLM applications with Python FastAPI and RAG evaluation on AWS.",
            "application_url": "https://linkedin.com/jobs/1",
            "source": "serpapi",
        }
    )
    # Prefer company career page over serpapi when both present
    a.source = "company_career_page"
    kept, removed = Deduplicator().dedupe([a, b])
    assert len(kept) == 1
    assert kept[0].source == "company_career_page"
    assert len(removed) == 1
