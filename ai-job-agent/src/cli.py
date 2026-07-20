"""Command-line interface for the AI Job Application Agent."""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

# Ensure project root is on sys.path when running as `python -m src.cli`
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.approval.queue import ApprovalQueue
from src.application_support.interview import prepare_interview
from src.application_support.prepare import prepare_application
from src.common.config import reload_config
from src.common.logging_config import setup_logging
from src.common.profile_loader import load_candidate_knowledge_base
from src.common.profile_review import add_missing_fact, review_profile
from src.common.profile_validation import validate_profile
from src.common.resume_import import import_resume
from src.job_discovery.discover import discover_jobs
from src.matching.analyze import analyze_jobs
from src.reporting.daily import generate_daily_report
from src.reporting.weekly import generate_weekly_report
from src.tracking.tracker import ApplicationTracker

console = Console()


@click.group()
@click.option("--log-level", default="INFO", show_default=True)
def main(log_level: str) -> None:
    """AI Job Application Automation Agent CLI."""
    setup_logging(log_level)


@main.command("initialize-profile")
def initialize_profile() -> None:
    """Validate profile/config and ensure tracker files exist."""
    reload_config()
    profile = load_candidate_knowledge_base()
    ApplicationTracker()
    ApprovalQueue()
    console.print("[green]Profile loaded[/green]")
    console.print(f"Name: {profile.full_name} ({profile.preferred_name})")
    console.print(f"Location: {profile.location_city}, {profile.location_state}")
    console.print(f"Resume imported: {profile.resume_imported}")
    console.print(f"Profile reviewed: {profile.profile_reviewed}")
    console.print(f"Profile approved: {profile.profile_approved}")
    console.print(f"Verified experiences: {len(profile.experiences)}")
    console.print(f"Verified skills: {len(profile.skills)}")
    if not profile.resume_imported:
        console.print(
            "[yellow]Action required:[/yellow] place resume under resumes/master/ "
            "and run `python -m src.cli import-resume --auto`."
        )
    elif not profile.profile_approved:
        console.print(
            "[yellow]Next:[/yellow] `python -m src.cli review-profile` "
            "then `python -m src.cli validate-profile`."
        )


@main.command("import-resume")
@click.argument("path", required=False, type=click.Path(exists=True, path_type=Path))
@click.option("--auto", is_flag=True, default=False, help="Auto-detect the single resume in resumes/master/")
@click.option("--dry-run", is_flag=True, default=False)
def import_resume_cmd(path: Path | None, auto: bool, dry_run: bool) -> None:
    """Import a PDF/DOCX/Markdown/TXT resume into the verified knowledge base."""
    if not auto and path is None:
        raise click.UsageError("Provide a resume PATH or use --auto.")
    result = import_resume(path, auto=auto, dry_run=dry_run)
    console.print_json(json.dumps(result, default=str))
    if not dry_run:
        console.print(
            "[green]Import complete.[/green] "
            "Review facts with: [bold]python -m src.cli review-profile[/bold]"
        )


@main.command("review-profile")
@click.option("--list-only", is_flag=True, default=False, help="List facts without interactive prompts")
@click.option(
    "--approve-all-pending",
    is_flag=True,
    default=False,
    help="Approve all pending non-unsupported facts (scriptable)",
)
@click.option("--mark-reviewed", is_flag=True, default=False, help="Mark profile_reviewed=true")
@click.option(
    "--mark-approved",
    is_flag=True,
    default=False,
    help="Mark profile_approved=true (requires reviewed)",
)
@click.option("--add-skill", default=None, help="Add a missing skill during review")
@click.option("--add-achievement", default=None, help="Add a missing achievement during review")
def review_profile_cmd(
    list_only: bool,
    approve_all_pending: bool,
    mark_reviewed: bool,
    mark_approved: bool,
    add_skill: str | None,
    add_achievement: str | None,
) -> None:
    """Interactively review extracted candidate facts."""
    if add_skill:
        console.print_json(json.dumps(add_missing_fact(category="skill", text=add_skill)))
    if add_achievement:
        console.print_json(
            json.dumps(add_missing_fact(category="achievement", text=add_achievement))
        )
    result = review_profile(
        interactive=not list_only and not approve_all_pending,
        approve_all_pending=approve_all_pending,
        mark_reviewed=mark_reviewed or approve_all_pending,
        mark_approved=mark_approved,
    )
    console.print_json(json.dumps(result, default=str))


@main.command("validate-profile")
def validate_profile_cmd() -> None:
    """Validate the candidate knowledge base and print readiness."""
    report = validate_profile()
    console.print(f"[bold]Readiness:[/bold] {report['readiness_percentage']}%")
    console.print(
        f"reviewed={report['profile_reviewed']} approved={report['profile_approved']} "
        f"ready_for_tailoring={report['ready_for_tailoring']}"
    )
    table = Table(title="Validation issues")
    table.add_column("Severity")
    table.add_column("Message")
    for issue in report["issues"]:
        table.add_row(issue["severity"], issue["message"])
    if report["issues"]:
        console.print(table)
    else:
        console.print("[green]No issues found.[/green]")
    console.print_json(json.dumps({"counts": report["counts"], "readiness_percentage": report["readiness_percentage"]}))


@main.command("discover-jobs")
@click.option("--dry-run", is_flag=True, default=False)
def discover_jobs_cmd(dry_run: bool) -> None:
    """Discover jobs from enabled local sources and normalize them."""
    result = discover_jobs(dry_run=dry_run)
    console.print(
        f"Raw={result['raw_count']} parsed={result['parsed_count']} "
        f"kept={len(result['kept'])} duplicates_removed={result['duplicates_removed']}"
    )
    if result["parse_errors"]:
        console.print(f"[yellow]Parse errors:[/yellow] {len(result['parse_errors'])}")


@main.command("analyze-jobs")
@click.option("--job-id", default=None)
@click.option("--dry-run", is_flag=True, default=False)
def analyze_jobs_cmd(job_id: str | None, dry_run: bool) -> None:
    """Score normalized jobs against the candidate knowledge base."""
    result = analyze_jobs(dry_run=dry_run, job_id=job_id)
    table = Table(title="Match results")
    table.add_column("Company")
    table.add_column("Title")
    table.add_column("Score")
    table.add_column("Class")
    table.add_column("Priority")
    for report in sorted(result["reports"], key=lambda r: r.match_score, reverse=True):
        table.add_row(
            report.company,
            report.title,
            f"{report.match_score:.1f}",
            report.classification.value,
            report.application_priority,
        )
    console.print(table)
    if not result["resume_imported"]:
        console.print("[yellow]Scores are provisional until resume import.[/yellow]")


@main.command("prepare-application")
@click.option("--job-id", required=True)
@click.option("--dry-run", is_flag=True, default=False)
def prepare_application_cmd(job_id: str, dry_run: bool) -> None:
    """Prepare analysis, answers, outreach, and tailored resume (if score ≥ 75)."""
    profile = load_candidate_knowledge_base()
    result = prepare_application(job_id, profile, dry_run=dry_run)
    console.print_json(json.dumps(result, default=str))


@main.command("daily-run")
@click.option("--dry-run", is_flag=True, default=False)
@click.option("--prepare-limit", default=5, show_default=True)
def daily_run_cmd(dry_run: bool, prepare_limit: int) -> None:
    """Run the full daily workflow: discover → analyze → prepare → report."""
    console.print("[bold]Phase 1: Review[/bold]")
    profile = load_candidate_knowledge_base()
    tracker = ApplicationTracker()
    follow_ups = tracker.follow_ups_due()
    console.print(
        f"Resume imported={profile.resume_imported} | "
        f"reviewed={profile.profile_reviewed} | "
        f"approved={profile.profile_approved} | "
        f"follow-ups due={len(follow_ups)}"
    )
    if not profile.is_ready_for_tailoring:
        console.print(
            "[yellow]Profile not approved for tailored resumes.[/yellow] "
            "daily-run will discover/analyze/report, but will NOT tailor resumes "
            "until `review-profile` + approval are complete."
        )

    console.print("[bold]Phase 2: Discover[/bold]")
    discovery = discover_jobs(dry_run=dry_run)

    console.print("[bold]Phase 3: Analyze[/bold]")
    analysis = analyze_jobs(dry_run=dry_run)

    console.print("[bold]Phase 4: Prepare[/bold]")
    prepared = []
    if profile.is_ready_for_tailoring:
        candidates = sorted(
            [r for r in analysis["reports"] if not r.rejected and r.match_score >= 75],
            key=lambda r: r.match_score,
            reverse=True,
        )[:prepare_limit]
        for report in candidates:
            prepared.append(prepare_application(report.job_id, profile, dry_run=dry_run))
    else:
        console.print(
            "[yellow]Skipping tailored resume / application package generation "
            "until profile is reviewed and approved.[/yellow]"
        )

    console.print("[bold]Phase 5: Report[/bold]")
    report_md = generate_daily_report(
        stats={
            "parsed_count": discovery["parsed_count"],
            "duplicates_removed": discovery["duplicates_removed"],
            "rejected_count": analysis["rejected_count"],
        },
        top_reports=analysis["reports"],
        prepared=prepared,
        dry_run=dry_run,
    )
    console.print(report_md)


@main.command("show-approval-queue")
def show_approval_queue() -> None:
    """List pending Level-2 approval actions."""
    pending = ApprovalQueue().list_pending()
    if not pending:
        console.print("No pending actions.")
        return
    table = Table(title="Approval queue")
    table.add_column("Action ID")
    table.add_column("Level")
    table.add_column("Type")
    table.add_column("Job")
    table.add_column("Description")
    for action in pending:
        table.add_row(
            action.action_id,
            action.safety_level.value,
            action.action_type,
            action.job_id or "",
            action.description,
        )
    console.print(table)


@main.command("approve")
@click.option("--action-id", required=True)
@click.option("--reject", is_flag=True, default=False, help="Reject instead of approve")
@click.option("--note", default="")
def approve_cmd(action_id: str, reject: bool, note: str) -> None:
    """Record approval/rejection for a queued action (does not auto-submit)."""
    action = ApprovalQueue().decide(action_id, approve=not reject, note=note)
    console.print(
        f"{action.action_id} -> {action.status.value} "
        f"(level={action.safety_level.value})"
    )
    if action.action_type == "submit_application":
        console.print(
            "[yellow]Approval recorded. You must submit the application yourself; "
            "the agent will never submit automatically. "
            "After submitting, run mark-applied.[/yellow]"
        )


@main.command("mark-applied")
@click.option("--job-id", required=True)
@click.option("--confirm", is_flag=True, required=True, help="Confirm you personally submitted.")
def mark_applied_cmd(job_id: str, confirm: bool) -> None:
    """Mark a job as Applied only after explicit user confirmation."""
    if not confirm:
        raise click.UsageError("Pass --confirm after you have personally submitted.")
    row = ApplicationTracker().update_status(
        job_id,
        "Applied",
        date_applied=date.today().isoformat(),
        user_confirmed_submission=True,
    )
    console.print(f"Marked Applied: {row['company']} — {row['job_title']}")


@main.command("prepare-interview")
@click.option("--job-id", required=True)
@click.option("--dry-run", is_flag=True, default=False)
def prepare_interview_cmd(job_id: str, dry_run: bool) -> None:
    """Create interview preparation materials for a job."""
    result = prepare_interview(job_id, dry_run=dry_run)
    console.print_json(json.dumps(result, default=str))


@main.command("weekly-review")
@click.option("--dry-run", is_flag=True, default=False)
def weekly_review_cmd(dry_run: bool) -> None:
    """Generate the weekly strategy review."""
    content = generate_weekly_report(dry_run=dry_run)
    console.print(content)


if __name__ == "__main__":
    main()
