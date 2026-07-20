"""Prepare application package for a single job (Level-1 drafting only)."""

from __future__ import annotations

import logging
from datetime import date
from pathlib import Path
from typing import Any

from src.approval.queue import ApprovalQueue
from src.common.io import load_json, save_json, write_text
from src.common.paths import APPLICATIONS_PREPARED, JOBS_ANALYZED, JOBS_NORMALIZED
from src.matching.scorer import MatchScorer
from src.models.approval import SafetyLevel
from src.models.candidate import CandidateProfile
from src.models.job import JobPosting
from src.outreach.drafts import draft_outreach_bundle
from src.resume_tailoring.tailor import ResumeTailor
from src.tracking.tracker import ApplicationTracker

logger = logging.getLogger("ai_job_agent.application_support")


def prepare_application(
    job_id: str,
    profile: CandidateProfile,
    *,
    dry_run: bool = False,
    min_score_for_resume: float = 75.0,
) -> dict[str, Any]:
    job = _load_job(job_id)
    analyzed_path = JOBS_ANALYZED / f"{job_id}.json"
    if analyzed_path.exists():
        report_data = load_json(analyzed_path)
        from src.models.matching import MatchReport

        report = MatchReport.model_validate(report_data)
    else:
        report = MatchScorer(profile).score(job)
        if not dry_run:
            save_json(analyzed_path, report.model_dump(mode="json"), backup=False)

    out_dir = APPLICATIONS_PREPARED / job_id
    if not dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)

    answers = _draft_answers(job, profile, report.match_score)
    company_brief = _company_brief(job)
    outreach = draft_outreach_bundle(job, profile)

    resume_info: dict[str, Any] | None = None
    if report.match_score >= min_score_for_resume and not report.rejected:
        if not dry_run:
            resume_info = ResumeTailor(profile).tailor(job, report)
        else:
            resume_info = {"dry_run": True, "would_tailor": True}
    else:
        resume_info = {
            "skipped": True,
            "reason": f"Score {report.match_score} below {min_score_for_resume} or rejected",
        }

    analysis_md = _render_analysis_markdown(report, job)

    approval_ids: list[str] = []
    tracker = ApplicationTracker()
    queue = ApprovalQueue()

    if not dry_run:
        write_text(out_dir / "analysis.md", analysis_md, backup=False)
        save_json(out_dir / "application_answers.json", answers, backup=False)
        write_text(out_dir / "company_brief.md", company_brief, backup=False)
        save_json(out_dir / "outreach_drafts.json", outreach, backup=False)
        if resume_info and resume_info.get("resume_path"):
            write_text(
                out_dir / "resume_pointer.txt",
                resume_info["resume_path"] + "\n",
                backup=False,
            )

        tracker.add_from_match(job, report)
        tracker.update_status(
            job_id,
            "Awaiting Approval",
            date_prepared=date.today().isoformat(),
            resume_version=resume_info.get("suggested_filename", "") if resume_info else "",
            notes="Prepared locally; awaiting user approval before any submission",
        )

        for action_type, desc in [
            ("use_tailored_resume", f"Use tailored resume for {job.company} — {job.title}"),
            ("submit_application", f"Submit application to {job.company} — {job.title}"),
            ("answer_work_authorization", "Answer work-authorization / sponsorship questions"),
            ("enter_salary_expectation", "Enter salary expectations"),
        ]:
            level = (
                SafetyLevel.NEVER_AUTOMATIC
                if action_type == "submit_application"
                else SafetyLevel.APPROVAL_REQUIRED
            )
            action = queue.enqueue(
                action_type,
                desc,
                job_id=job_id,
                payload={"application_url": job.application_url},
                safety_level=level,
            )
            approval_ids.append(action.action_id)

        for key, message in outreach.items():
            action = queue.enqueue(
                "send_outreach_message",
                f"Send {key} outreach for {job.company}",
                job_id=job_id,
                payload={"message": message, "channel": key},
                safety_level=SafetyLevel.APPROVAL_REQUIRED,
            )
            approval_ids.append(action.action_id)

    return {
        "job_id": job_id,
        "company": job.company,
        "title": job.title,
        "match_score": report.match_score,
        "classification": report.classification.value,
        "output_dir": str(out_dir),
        "resume": resume_info,
        "approval_action_ids": approval_ids,
        "dry_run": dry_run,
        "application_ready": bool(resume_info and resume_info.get("application_ready")),
    }


def _load_job(job_id: str) -> JobPosting:
    path = JOBS_NORMALIZED / f"{job_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Normalized job not found: {path}. Run discover-jobs first.")
    return JobPosting.model_validate(load_json(path))


def _draft_answers(job: JobPosting, profile: CandidateProfile, score: float) -> dict[str, Any]:
    edu = profile.education[0] if profile.education else None
    edu_text = (
        f"{edu.degree} from {edu.institution}"
        if edu
        else "education details pending resume import"
    )
    return {
        "why_interested_in_role": {
            "draft": (
                f"I am pursuing full-time AI engineering roles focused on production systems. "
                f"The {job.title} role at {job.company} aligns with my target direction in "
                f"applied AI/ML and backend systems. {edu_text}."
            ),
            "requires_user_confirmation": False,
            "notes": "Refine after resume import with project-specific evidence.",
        },
        "why_this_company": {
            "draft": (
                f"I am interested in {job.company} based on the public role description for "
                f"{job.title}. I will personalize this further after reviewing the company brief."
            ),
            "requires_user_confirmation": True,
            "notes": "Company-specific research may be incomplete; confirm before submitting.",
        },
        "relevant_project": {
            "draft": None,
            "requires_user_confirmation": True,
            "notes": "REQUIRES USER CONFIRMATION — no verified projects in knowledge base yet.",
            "status": "REQUIRES USER CONFIRMATION",
        },
        "technical_challenge": {
            "draft": None,
            "requires_user_confirmation": True,
            "notes": "REQUIRES USER CONFIRMATION — pending verified experience import.",
            "status": "REQUIRES USER CONFIRMATION",
        },
        "python_experience": {
            "draft": None if "python" not in profile.verified_technologies else "See verified skills.",
            "requires_user_confirmation": "python" not in profile.verified_technologies,
            "status": (
                "REQUIRES USER CONFIRMATION"
                if "python" not in profile.verified_technologies
                else "draft_ok"
            ),
        },
        "ai_ml_experience": {
            "draft": None,
            "requires_user_confirmation": True,
            "status": "REQUIRES USER CONFIRMATION",
            "notes": "Only answer from verified resume/projects after import.",
        },
        "salary_expectations": {
            "draft": None,
            "requires_user_confirmation": True,
            "status": "REQUIRES USER CONFIRMATION",
            "reason": "Salary expectations are personal and must be confirmed by the user.",
            "exact_question": "What are your salary expectations?",
        },
        "legally_authorized_to_work_in_us": {
            "draft": None,
            "requires_user_confirmation": True,
            "status": "REQUIRES USER CONFIRMATION",
            "reason": "Legal work-authorization answer must be confirmed by the candidate.",
            "exact_question": "Are you legally authorized to work in the United States?",
            "profile_note": profile.work_authorization_status,
        },
        "requires_sponsorship": {
            "draft": None,
            "requires_user_confirmation": True,
            "status": "REQUIRES USER CONFIRMATION",
            "reason": "Sponsorship questions are legal/attestation fields; never auto-answered.",
            "exact_question": "Will you now or in the future require sponsorship?",
            "profile_note": profile.work_authorization_status,
            "posting_language": {
                "work_authorization": job.work_authorization_language,
                "sponsorship": job.sponsorship_language,
            },
        },
        "match_score_context": score,
    }


def _company_brief(job: JobPosting) -> str:
    return "\n".join(
        [
            f"# Company brief — {job.company}",
            "",
            "## Verified from posting",
            f"- Role: {job.title}",
            f"- Location: {job.location or 'Not specified'}",
            f"- Arrangement: {job.work_arrangement.value}",
            f"- Source: {job.source}",
            f"- URL: {job.original_url or job.application_url}",
            "",
            "## Inference (label clearly — confirm before relying)",
            "- What the company does: *Not independently verified in this build; research required.*",
            "- Main products: *Unknown / needs research.*",
            "- Business model: *Unknown / needs research.*",
            "- AI/engineering initiatives: *Inferred only from job description signals below.*",
            "",
            "## Signals from job description",
            job.description[:1500] + ("..." if len(job.description) > 1500 else ""),
            "",
            "## Why background may be relevant",
            "- Candidate targets AI/ML/LLM engineering and holds an M.S. in Computer Science.",
            "- Detailed relevance depends on imported resume projects/experience.",
            "",
            "## Potential risks",
            "- Incomplete company research in automated brief.",
            f"- Work-auth language: {job.work_authorization_language or 'Not stated'}",
            f"- Sponsorship language: {job.sponsorship_language or 'Not stated — flag for review'}",
            "",
        ]
    )


def _render_analysis_markdown(report: Any, job: JobPosting) -> str:
    def bullets(items: list[str], empty: str) -> list[str]:
        return [f"- {x}" for x in items] if items else [empty]

    lines: list[str] = [
        f"# Job analysis — {job.title} @ {job.company}",
        "",
        f"**Match score:** {report.match_score} ({report.classification.value})",
        f"**Priority:** {report.application_priority}",
        "",
        "## Executive recommendation",
        report.executive_recommendation,
        "",
        "## Why the role fits",
        *bullets(report.why_fits, "- n/a"),
        "",
        "## Strongest matching qualifications",
        *bullets(report.strongest_qualifications, "- n/a"),
        "",
        "## Missing required",
        *bullets(report.missing_required, "- None listed / insufficient data"),
        "",
        "## Missing preferred",
        *bullets(report.missing_preferred, "- None listed / insufficient data"),
        "",
        "## Transferable skills",
        *bullets(report.transferable_skills, "- n/a"),
        "",
        "## Keywords to include (only if verified)",
        ", ".join(report.keywords_to_include) or "n/a",
        "",
        "## Potential concerns",
        *bullets(report.potential_concerns, "- None"),
        "",
        "## Work authorization language",
        report.work_authorization_language or "Not stated",
        "",
        "## Sponsorship language",
        report.sponsorship_language or "Not stated — do not auto-reject",
        "",
        "## Likely interview topics",
        *bullets(report.likely_interview_topics, "- n/a"),
        "",
        f"**Referral would help:** {report.referral_would_help}",
        "",
        "## Assumptions",
        *bullets(report.assumptions, "- None"),
        "",
        "## Requirement breakdown",
    ]
    for rm in report.requirement_matches:
        lines.append(f"- [{rm.status.value}] {rm.requirement} — {rm.evidence}")
    lines.append("")
    return "\n".join(lines)
