"""Weekly review report generator."""

from __future__ import annotations

from collections import Counter
from datetime import date
from typing import Any

from src.common.io import write_text
from src.common.paths import REPORTS_WEEKLY
from src.tracking.tracker import ApplicationTracker


def generate_weekly_report(*, on_date: date | None = None, dry_run: bool = False) -> str:
    day = on_date or date.today()
    iso_year, iso_week, _ = day.isocalendar()
    tracker = ApplicationTracker()
    rows = tracker.list_rows()
    n = len(rows)

    submitted = [r for r in rows if r.get("application_status") not in {"", "Discovered", "Analyzing", "Skip", "Preparing", "Awaiting Approval", "Ready to Apply"} or r.get("date_applied")]
    applied = [r for r in rows if r.get("application_status") == "Applied" or r.get("date_applied")]
    rejected = [r for r in rows if r.get("application_status") == "Rejected"]
    interviews = [
        r
        for r in rows
        if r.get("application_status")
        in {
            "Recruiter Screen",
            "Technical Interview",
            "Hiring Manager Interview",
            "Final Interview",
            "Offer",
        }
    ]

    sources = Counter(r.get("source") or "unknown" for r in applied or rows)
    resumes = Counter(r.get("resume_version") or "unknown" for r in applied)
    companies = Counter(r.get("company") or "unknown" for r in rows)

    overdue = [
        r
        for r in rows
        if r.get("next_follow_up_date")
        and r["next_follow_up_date"] < day.isoformat()
        and r.get("application_status") not in {"Rejected", "Withdrawn", "Closed", "Skip"}
    ]

    lines = [
        f"# Weekly Review — {iso_year}-W{iso_week:02d}",
        "",
        f"**Sample size:** {n} tracker rows "
        f"({len(applied)} applied, {len(interviews)} interview-stage, {len(rejected)} rejected).",
        "",
        "_Do not over-interpret metrics from a very small sample._",
        "",
        "## Funnel",
        f"- Applications submitted (Applied): {len(applied)}",
        f"- Rejected: {len(rejected)}",
        f"- Interview-stage: {len(interviews)}",
        f"- Response/interview rate: {_rate(len(interviews), len(applied))}",
        f"- Rejection rate: {_rate(len(rejected), len(applied))}",
        "",
        "## Best-performing job sources (by presence in tracker)",
        *([f"- {k}: {v}" for k, v in sources.most_common(5)] or ["- n/a"]),
        "",
        "## Resume versions used in Applied rows",
        *([f"- {k}: {v}" for k, v in resumes.most_common(5)] or ["- n/a"]),
        "",
        "## Companies with repeated hiring signals",
        *([f"- {k}: {v}" for k, v in companies.most_common(5) if v > 1] or ["- None with repeats yet"]),
        "",
        "## Follow-ups overdue",
        *([f"- {r.get('company')} / {r.get('job_title')} (due {r.get('next_follow_up_date')})" for r in overdue] or ["- None"]),
        "",
        "## Recommended strategy changes",
        "- Keep prioritizing official career pages over staffing reposts.",
        "- Import a complete resume before scaling application volume.",
        "- Prefer fewer, high-score (≥75) tailored applications over mass apply.",
        "",
        "## Recommended portfolio improvements",
        "- Add 1–2 production-flavored AI projects (RAG, evaluation, or agent workflow) with clear metrics.",
        "- Document deployment/API surfaces (FastAPI + cloud) if verified experience supports it.",
        "",
        "## Recommended learning priorities",
        "- Skills that repeatedly appear in strong AI postings (see daily reports).",
        "- Interview drills: Python, LLM/RAG debugging, backend API design.",
        "",
    ]
    content = "\n".join(lines)
    if not dry_run:
        path = REPORTS_WEEKLY / f"{iso_year}-W{iso_week:02d}.md"
        write_text(path, content, backup=True)
    return content


def _rate(num: int, den: int) -> str:
    if den == 0:
        return "n/a (sample size 0)"
    return f"{(num / den) * 100:.0f}% (n={den})"
