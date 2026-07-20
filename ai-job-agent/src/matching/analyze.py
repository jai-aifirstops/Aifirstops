"""Analyze normalized jobs and persist match reports."""

from __future__ import annotations

import logging
from typing import Any

from src.common.io import load_json, save_json
from src.common.paths import JOBS_ANALYZED, JOBS_ARCHIVED, JOBS_NORMALIZED
from src.common.profile_loader import load_candidate_knowledge_base
from src.matching.scorer import MatchScorer
from src.models.job import JobPosting
from src.tracking.tracker import ApplicationTracker

logger = logging.getLogger("ai_job_agent.analyze")


def analyze_jobs(*, dry_run: bool = False, job_id: str | None = None) -> dict[str, Any]:
    profile = load_candidate_knowledge_base()
    scorer = MatchScorer(profile)
    tracker = ApplicationTracker()

    files = (
        [JOBS_NORMALIZED / f"{job_id}.json"]
        if job_id
        else sorted(JOBS_NORMALIZED.glob("*.json"))
    )
    reports = []
    rejected_count = 0

    for path in files:
        if not path.exists():
            continue
        job = JobPosting.model_validate(load_json(path))
        report = scorer.score(job)
        reports.append(report)
        if report.rejected:
            rejected_count += 1
            if not dry_run:
                save_json(JOBS_ARCHIVED / f"{job.job_id}.json", job.model_dump(mode="json"), backup=False)
        if not dry_run:
            save_json(JOBS_ANALYZED / f"{job.job_id}.json", report.model_dump(mode="json"), backup=False)
            tracker.add_from_match(job, report)

    return {
        "analyzed_count": len(reports),
        "rejected_count": rejected_count,
        "reports": reports,
        "dry_run": dry_run,
        "resume_imported": profile.resume_imported,
    }
