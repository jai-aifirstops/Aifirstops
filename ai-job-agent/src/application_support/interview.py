"""Generate interview preparation materials for a job."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from src.common.io import load_json, write_text
from src.common.paths import APPLICATIONS_INTERVIEWS, JOBS_ANALYZED, JOBS_NORMALIZED
from src.common.profile_loader import load_candidate_knowledge_base
from src.models.job import JobPosting
from src.outreach.drafts import draft_outreach_bundle


def prepare_interview(job_id: str, *, dry_run: bool = False) -> dict[str, Any]:
    job = JobPosting.model_validate(load_json(JOBS_NORMALIZED / f"{job_id}.json"))
    profile = load_candidate_knowledge_base()
    analysis = load_json(JOBS_ANALYZED / f"{job_id}.json") if (JOBS_ANALYZED / f"{job_id}.json").exists() else {}
    outreach = draft_outreach_bundle(job, profile)

    out_dir = APPLICATIONS_INTERVIEWS / job_id
    content = _render(job, profile, analysis, outreach)

    if not dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)
        write_text(out_dir / "interview_prep.md", content, backup=True)

    return {"job_id": job_id, "output_dir": str(out_dir), "dry_run": dry_run}


def _render(job: JobPosting, profile: Any, analysis: dict, outreach: dict[str, str]) -> str:
    name = profile.preferred_name or "Jai"
    edu = profile.education[0] if profile.education else None
    tell = (
        f"I'm {name}, based in {profile.location_city or 'Austin'}. "
        f"I hold {edu.degree if edu else 'an M.S. in Computer Science'} "
        f"from {edu.institution if edu else 'the University of Memphis'} and I'm focused on "
        f"AI engineering roles building production systems — LLMs, applied ML, and reliable backends. "
        f"I'm excited about the {job.title} role at {job.company}."
    )
    return "\n".join(
        [
            f"# Interview prep — {job.title} @ {job.company}",
            "",
            "## Job-description breakdown",
            job.description[:3000],
            "",
            "## Match analysis snapshot",
            f"- Score: {analysis.get('match_score', 'n/a')}",
            f"- Priority: {analysis.get('application_priority', 'n/a')}",
            "",
            "## Resume walkthrough",
            "- Walk only through verified experiences/projects from the submitted resume.",
            "- If resume import is incomplete, pause interview prep until materials are verified.",
            "",
            "## Tell me about yourself",
            tell,
            "",
            "## Why this company",
            f"Draft: Interest grounded in the {job.title} posting; personalize with company research before the interview.",
            "",
            "## Why this role",
            f"Aligns with target AI engineering direction and production AI systems focus.",
            "",
            "## Project explanations",
            "_Populate from verified project inventory after resume import._",
            "",
            "## Behavioral STAR stories",
            "- Situation/Task/Action/Result must map to verified bullets only.",
            "",
            "## Likely technical questions",
            "- Python fundamentals and debugging",
            "- API / backend design",
            "- AI/ML practical questions from the posting",
            "- LLM and RAG evaluation / failure modes (if relevant)",
            "- System design for an AI feature",
            "",
            "## Questions to ask the interviewer",
            "- How does the team evaluate AI features in production?",
            "- What does the first 90 days look like for this role?",
            "- How are model/quality ownership boundaries defined across teams?",
            "",
            "## Compensation discussion",
            "REQUIRES USER CONFIRMATION — do not invent a number.",
            "",
            "## Work-authorization response",
            "REQUIRES USER CONFIRMATION",
            f"Profile note: {profile.work_authorization_status}",
            f"Posting language: {job.work_authorization_language or 'n/a'} / {job.sponsorship_language or 'n/a'}",
            "",
            "## Mock interview script",
            "1. Intro (2 min) → Tell me about yourself",
            "2. Resume deep-dive (10 min)",
            "3. Technical screen aligned to posting stack (20–30 min)",
            "4. Candidate questions (5 min)",
            "",
            "## Post-interview thank-you draft",
            outreach.get("thank_you_after_interview", ""),
            "",
            "_Do not send thank-you notes without approval._",
            "",
        ]
    )
