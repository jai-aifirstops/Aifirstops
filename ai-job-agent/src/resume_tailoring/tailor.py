"""Tailor resumes using only verified candidate facts."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

from src.common.io import read_text, write_text
from src.common.paths import CANDIDATE_DIR, RESUMES_TAILORED
from src.models.candidate import CandidateProfile, ClaimType
from src.models.job import JobPosting
from src.models.matching import MatchReport

logger = logging.getLogger("ai_job_agent.resume_tailoring")


class ResumeTailor:
    """Produce ATS-friendly tailored resumes with verification artifacts."""

    def __init__(self, profile: CandidateProfile, output_dir: Path | None = None) -> None:
        self.profile = profile
        self.output_dir = output_dir or RESUMES_TAILORED

    def tailor(self, job: JobPosting, report: MatchReport) -> dict[str, Any]:
        if report.match_score < 75:
            raise ValueError(
                f"Refusing to tailor resume for score {report.match_score} (< 75). "
                "Prepare analysis only."
            )
        if not self.profile.resume_imported and not self.profile.experiences:
            logger.warning("Tailoring with incomplete profile — output marked NOT application-ready")

        company_slug = _slug(job.company)
        role_slug = _slug(job.title)
        base_name = f"Jaideep_Ponnam_{company_slug}_{role_slug}_Resume"
        out_dir = self.output_dir / f"{job.job_id}_{company_slug}"
        out_dir.mkdir(parents=True, exist_ok=True)

        resume_md = self._render_resume(job, report)
        changelog = self._changelog(job, report)
        keyword_report = self._keyword_coverage(job, resume_md)
        claims_report = self._claims_verification()
        gaps = list(report.missing_required) + [
            g for g in report.missing_preferred if g not in report.missing_required
        ]

        resume_path = out_dir / f"{base_name}.md"
        write_text(resume_path, resume_md, backup=True)
        write_text(out_dir / f"{base_name}_CHANGELOG.md", changelog, backup=False)
        write_text(out_dir / f"{base_name}_KEYWORDS.md", keyword_report, backup=False)
        write_text(out_dir / f"{base_name}_CLAIMS.md", claims_report, backup=False)
        write_text(
            out_dir / f"{base_name}_GAPS.md",
            "# Gaps that could not be addressed honestly\n\n"
            + ("\n".join(f"- {g}" for g in gaps) if gaps else "- None identified from verified data.\n")
            + "\n\nDo not invent experience to close these gaps.\n",
            backup=False,
        )

        return {
            "suggested_filename": base_name,
            "resume_path": str(resume_path),
            "output_dir": str(out_dir),
            "application_ready": bool(self.profile.resume_imported and self.profile.experiences),
            "gaps": gaps,
        }

    def _render_resume(self, job: JobPosting, report: MatchReport) -> str:
        lines: list[str] = [
            f"# {self.profile.full_name}",
            "",
            f"{self.profile.location_city}, {self.profile.location_state}"
            + (f" | {self.profile.email}" if self.profile.email else ""),
            "",
            "## Summary",
            "",
        ]
        summary = (
            f"Computer Science graduate (M.S., University of Memphis) targeting {job.title} roles "
            f"focused on production AI systems. Prefer full-time opportunities in Austin, TX or remote U.S."
        )
        if self.profile.work_authorization_status:
            summary += f" Work authorization: {self.profile.work_authorization_status} (confirm before disclosing)."
        lines.extend([summary, ""])

        # Skills — only verified
        skills = [
            s.name
            for s in self.profile.skills
            if s.can_include_in_resume and s.claim_type != ClaimType.UNSUPPORTED
        ]
        lines.extend(["## Skills", ""])
        if skills:
            # Reorder skills that appear in job keywords first
            keywords = {k.lower() for k in report.keywords_to_include}
            ordered = sorted(skills, key=lambda s: (0 if s.lower() in keywords else 1, s.lower()))
            lines.append(", ".join(ordered))
        else:
            lines.append(
                "_No verified skills imported. Import resume before using this document in an application._"
            )
        lines.append("")

        lines.extend(["## Experience", ""])
        experiences = [e for e in self.profile.experiences if e.can_include_in_resume]
        if not experiences:
            lines.append(
                "_No verified employment history imported. "
                "Do not submit this tailored resume until resume import is complete._"
            )
            lines.append("")
        else:
            # Rank experiences by overlap with job text
            job_text = job.searchable_text()
            ranked = sorted(
                experiences,
                key=lambda e: _relevance(e.technologies, e.responsibilities, job_text),
                reverse=True,
            )
            for exp in ranked:
                dates = " – ".join(x for x in [exp.start_date or "", exp.end_date or "Present"] if x)
                lines.append(f"### {exp.role}, {exp.employer}")
                if dates or exp.location:
                    lines.append(f"{dates}" + (f" | {exp.location}" if exp.location else ""))
                lines.append("")
                bullets = [
                    b
                    for b in exp.responsibilities + exp.measurable_results
                    if b.can_include_in_resume and b.claim_type != ClaimType.UNSUPPORTED
                ]
                bullets = sorted(bullets, key=lambda b: _bullet_relevance(b.text, job_text), reverse=True)
                for bullet in bullets:
                    text = _reframe_bullet(bullet.text, report.keywords_to_include, bullet.claim_type)
                    lines.append(f"- {text}")
                lines.append("")

        lines.extend(["## Projects", ""])
        projects = [p for p in self.profile.projects if p.can_include_in_resume]
        if not projects:
            lines.append("_No verified projects imported._")
            lines.append("")
        else:
            for proj in projects:
                lines.append(f"### {proj.name}")
                if proj.technologies:
                    lines.append("Technologies: " + ", ".join(proj.technologies))
                if proj.description:
                    lines.append(f"- {proj.description}")
                for result in proj.measurable_results:
                    if result.can_include_in_resume and result.claim_type != ClaimType.UNSUPPORTED:
                        lines.append(f"- {result.text}")
                lines.append("")

        lines.extend(["## Education", ""])
        for edu in self.profile.education:
            grad = edu.graduation_date or "Date REQUIRES USER CONFIRMATION"
            lines.append(f"**{edu.degree}**, {edu.institution}")
            lines.append(grad + (f" | {edu.location}" if edu.location else ""))
            lines.append("")

        lines.extend(
            [
                "---",
                f"_Tailored for {job.title} at {job.company}. "
                "Contains only verified or reasonably reframed claims. "
                f"Match score: {report.match_score}._",
                "",
            ]
        )
        return "\n".join(lines)

    def _changelog(self, job: JobPosting, report: MatchReport) -> str:
        master = CANDIDATE_DIR / "master_resume.md"
        master_exists = master.exists()
        return "\n".join(
            [
                f"# Resume changelog — {job.company} / {job.title}",
                "",
                f"- Source master resume present: {master_exists}",
                f"- Target match score: {report.match_score}",
                "- Reordered bullets/skills by relevance to job keywords where verified data exists",
                "- Did not add skills solely because they appear in the posting",
                "- Preserved employers, titles, and dates from verified experience",
                "- Marked document incomplete if resume not imported",
                "",
                "## Resume changes needed (from analysis)",
                "",
                *[f"- {c}" for c in report.resume_changes_needed],
                "",
            ]
        )

    def _keyword_coverage(self, job: JobPosting, resume_md: str) -> str:
        resume_l = resume_md.lower()
        rows = []
        for kw in report_keywords(job):
            present = kw.lower() in resume_l
            verified = kw.lower() in self.profile.verified_technologies
            rows.append(f"| {kw} | {'yes' if present else 'no'} | {'yes' if verified else 'no'} |")
        body = "\n".join(rows) if rows else "| (none) | | |"
        return (
            "# Keyword coverage report\n\n"
            "| Keyword | In tailored resume | Verified in profile |\n"
            "|---|---|---|\n"
            f"{body}\n\n"
            "Keywords are included only when verified experience supports them.\n"
        )

    def _claims_verification(self) -> str:
        lines = ["# Claims verification report", ""]
        if not self.profile.experiences and not self.profile.skills:
            lines.extend(
                [
                    "No verified experience/skills loaded.",
                    "Status: **NOT SAFE FOR SUBMISSION** until resume import.",
                    "",
                ]
            )
            return "\n".join(lines)

        for exp in self.profile.experiences:
            lines.append(f"## {exp.role} @ {exp.employer}")
            for item in exp.responsibilities + exp.measurable_results:
                lines.append(
                    f"- [{item.claim_type.value} / {item.confidence.value}] {item.text}"
                )
                if item.supporting_text:
                    lines.append(f"  - Evidence: {item.supporting_text[:200]}")
                if item.source_file:
                    lines.append(f"  - Source: {item.source_file}")
            lines.append("")
        return "\n".join(lines)


def report_keywords(job: JobPosting) -> list[str]:
    kws = list(job.technology_stack)
    for token in re.findall(
        r"\b(Python|FastAPI|AWS|GCP|Azure|Docker|Kubernetes|PyTorch|TensorFlow|"
        r"LangChain|RAG|LLM|MLOps|PostgreSQL|Redis)\b",
        job.description,
        re.I,
    ):
        if token not in kws:
            kws.append(token)
    return kws[:25]


def _slug(value: str) -> str:
    text = re.sub(r"[^A-Za-z0-9]+", "_", value.strip())
    return text.strip("_")[:40] or "Role"


def _relevance(technologies: list[str], responsibilities: list[Any], job_text: str) -> int:
    score = 0
    for t in technologies:
        if t.lower() in job_text:
            score += 3
    for r in responsibilities:
        text = getattr(r, "text", str(r)).lower()
        score += sum(1 for w in text.split() if len(w) > 5 and w in job_text)
    return score


def _bullet_relevance(text: str, job_text: str) -> int:
    return sum(1 for w in text.lower().split() if len(w) > 5 and w in job_text)


def _reframe_bullet(text: str, keywords: list[str], claim_type: ClaimType) -> str:
    """Lightly mirror JD language only for verified content; never invent."""
    if claim_type == ClaimType.UNSUPPORTED:
        return text
    # Do not forcibly inject keywords; keep truthful wording
    return text
