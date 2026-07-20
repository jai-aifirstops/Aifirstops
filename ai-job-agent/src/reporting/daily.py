"""Daily job-search report generator."""

from __future__ import annotations

from collections import Counter
from datetime import date
from typing import Any

from src.approval.queue import ApprovalQueue
from src.common.io import write_text
from src.common.paths import REPORTS_DAILY
from src.tracking.tracker import ApplicationTracker


def generate_daily_report(
    *,
    stats: dict[str, Any],
    top_reports: list[Any],
    prepared: list[dict[str, Any]],
    on_date: date | None = None,
    dry_run: bool = False,
) -> str:
    day = on_date or date.today()
    tracker = ApplicationTracker()
    follow_ups = tracker.follow_ups_due(day)
    pending = ApprovalQueue().list_pending()

    interviews = [
        r
        for r in tracker.list_rows()
        if r.get("application_status")
        in {
            "Recruiter Screen",
            "Technical Interview",
            "Hiring Manager Interview",
            "Final Interview",
        }
    ]

    skill_counter: Counter[str] = Counter()
    for report in top_reports:
        for kw in getattr(report, "keywords_to_include", []) or []:
            skill_counter[kw] += 1

    learning = (
        skill_counter.most_common(1)[0][0]
        if skill_counter
        else "Import resume, then re-run analysis to identify skill gaps"
    )

    strong = [r for r in top_reports if getattr(r, "match_score", 0) >= 75 and not getattr(r, "rejected", False)]
    lines = [
        f"# Daily Job Search Summary — {day.isoformat()}",
        "",
        "## Daily Job Search Summary",
        "",
        f"- **Date:** {day.isoformat()}",
        f"- **Jobs reviewed:** {stats.get('parsed_count', 0)}",
        f"- **Duplicates removed:** {stats.get('duplicates_removed', 0)}",
        f"- **Rejected:** {stats.get('rejected_count', 0)}",
        f"- **Strong matches (≥75):** {len(strong)}",
        f"- **Applications prepared:** {len(prepared)}",
        f"- **Follow-ups due:** {len(follow_ups)}",
        f"- **Interviews active:** {len(interviews)}",
        "",
        "## Top Opportunities",
        "",
    ]

    ranked = sorted(
        [r for r in top_reports if not getattr(r, "rejected", False)],
        key=lambda r: r.match_score,
        reverse=True,
    )[:10]

    if not ranked:
        lines.append("_No scored opportunities today._")
        lines.append("")
    else:
        for report in ranked:
            reasons = (report.why_fits or ["n/a"])[:3]
            gap = (report.missing_required or report.potential_concerns or ["n/a"])[0]
            auth = report.sponsorship_language or report.work_authorization_language or "Not stated — flag for review"
            lines.extend(
                [
                    f"### {report.company} — {report.title}",
                    f"- **Priority:** {report.application_priority}",
                    f"- **Match score:** {report.match_score} ({report.classification.value})",
                    f"- **Top reasons:** {'; '.join(reasons)}",
                    f"- **Main gap:** {gap}",
                    f"- **Work-authorization note:** {auth}",
                    f"- **Recommended next action:** {report.application_priority}",
                    f"- **Job ID:** {report.job_id}",
                    "",
                ]
            )

    lines.extend(["## Approval Queue", ""])
    if not pending:
        lines.append("_No pending approval actions._")
        lines.append("")
    else:
        for action in pending:
            lines.append(
                f"- `{action.action_id}` [{action.safety_level.value}] "
                f"{action.action_type}: {action.description}"
            )
        lines.append("")

    lines.extend(
        [
            "## Today’s Action Plan",
            "",
            "1. Complete onboarding if needed: `import-resume --auto` → `review-profile` → `validate-profile`.",
            "2. Review Top Opportunities and reject any that are not a fit.",
            "3. For each Awaiting Approval application, confirm resume version and answers.",
            "4. Manually submit only after approving Level-2 items; never ask the agent to auto-submit.",
            "5. Complete one learning task related to: "
            f"**{learning}** (high-frequency keyword in today’s strong postings).",
            "",
            "## Skills appearing repeatedly",
            "",
        ]
    )
    if skill_counter:
        for skill, count in skill_counter.most_common(10):
            lines.append(f"- {skill}: {count} postings")
    else:
        lines.append("- Insufficient data")
    lines.extend(
        [
            "",
            f"## Recommended learning task",
            f"- Focus practice/project time on: {learning}",
            "",
            f"_Dry run: {dry_run}_",
            "",
        ]
    )

    content = "\n".join(lines)
    if not dry_run:
        path = REPORTS_DAILY / f"{day.isoformat()}.md"
        write_text(path, content, backup=True)
    return content
