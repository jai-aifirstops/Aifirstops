"""Integration-ish tests for discover + analyze using fixtures."""

from src.job_discovery.discover import discover_jobs
from src.matching.analyze import analyze_jobs


def test_discover_and_analyze_fixtures():
    discovery = discover_jobs(dry_run=True)
    assert discovery["parsed_count"] >= 4
    assert discovery["duplicates_removed"] >= 1

    # Persist normalized jobs for analyze (non-dry for normalized writes)
    discovery = discover_jobs(dry_run=False)
    assert len(discovery["kept"]) >= 3

    analysis = analyze_jobs(dry_run=True)
    assert analysis["analyzed_count"] >= 3
    assert analysis["rejected_count"] >= 1  # citizenship + staff roles

    scores = {r.job_id: r for r in analysis["reports"]}
    assert "secureco-ml-001" in scores
    assert scores["secureco-ml-001"].rejected
    assert "mega-staff-001" in scores
    assert scores["mega-staff-001"].rejected
