"""Score job fit against verified candidate profile."""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from src.common.config import load_job_preferences, load_scoring_rules
from src.models.candidate import CandidateProfile, ClaimType
from src.models.job import JobPosting, WorkArrangement
from src.models.matching import (
    MatchClassification,
    MatchReport,
    RequirementMatch,
    RequirementStatus,
    ScoreBreakdown,
)

logger = logging.getLogger("ai_job_agent.matching")


def classify_score(score: float, rejected: bool = False) -> MatchClassification:
    if rejected:
        return MatchClassification.REJECTED
    if score >= 85:
        return MatchClassification.EXCEPTIONAL
    if score >= 75:
        return MatchClassification.STRONG
    if score >= 65:
        return MatchClassification.POSSIBLE
    if score >= 50:
        return MatchClassification.LOW_PRIORITY
    return MatchClassification.SKIP


class MatchScorer:
    """Weighted match scorer with hard reject rules."""

    def __init__(
        self,
        profile: CandidateProfile,
        scoring_rules: dict[str, Any] | None = None,
        preferences: dict[str, Any] | None = None,
    ) -> None:
        self.profile = profile
        self.rules = scoring_rules or load_scoring_rules()
        self.preferences = preferences or load_job_preferences()
        self.weights = self.rules.get("weights", {})

    def score(self, job: JobPosting) -> MatchReport:
        rejection = self._hard_reject(job)
        if rejection:
            return MatchReport(
                job_id=job.job_id,
                company=job.company,
                title=job.title,
                match_score=0.0,
                classification=MatchClassification.REJECTED,
                rejected=True,
                rejection_reason=rejection,
                executive_recommendation=f"Reject: {rejection}",
                work_authorization_language=job.work_authorization_language,
                sponsorship_language=job.sponsorship_language,
                application_priority="Skip",
                potential_concerns=[rejection],
            )

        breakdown = ScoreBreakdown()
        text = job.searchable_text()
        verified_techs = self.profile.verified_technologies
        assumptions: list[str] = []

        if not self.profile.resume_imported:
            assumptions.append(
                "Resume not imported — technical/experience scores use education + profile only; "
                "results are provisional."
            )

        # Core technical skills (25)
        core_keywords = [k.lower() for k in self.rules.get("core_skill_keywords", [])]
        job_core = [k for k in core_keywords if k in text]
        if job_core and verified_techs:
            overlap = sum(1 for k in job_core if any(k in t or t in k for t in verified_techs))
            ratio = overlap / max(len(job_core), 1)
            breakdown.core_technical_skills = round(self.weights.get("core_technical_skills", 25) * ratio, 2)
        elif job_core and not verified_techs:
            breakdown.core_technical_skills = round(self.weights.get("core_technical_skills", 25) * 0.25, 2)
            assumptions.append("No verified skills yet; core skill score discounted.")
        else:
            breakdown.core_technical_skills = round(self.weights.get("core_technical_skills", 25) * 0.5, 2)

        # Relevant experience (20)
        exp_weight = self.weights.get("relevant_experience", 20)
        if self.profile.experiences:
            responsibility_hits = 0
            total_bullets = 0
            for exp in self.profile.experiences:
                for item in exp.responsibilities:
                    if item.claim_type == ClaimType.UNSUPPORTED:
                        continue
                    total_bullets += 1
                    blob = item.text.lower()
                    if any(word in text for word in blob.split() if len(word) > 4):
                        responsibility_hits += 1
            ratio = (responsibility_hits / total_bullets) if total_bullets else 0.4
            breakdown.relevant_experience = round(exp_weight * min(1.0, ratio + 0.2), 2)
        else:
            breakdown.relevant_experience = round(exp_weight * 0.2, 2)
            assumptions.append("No verified experience; experience score minimal.")

        # AI/ML/LLM relevance (15)
        ai_keywords = [k.lower() for k in self.rules.get("ai_relevance_keywords", [])]
        ai_hits = sum(1 for k in ai_keywords if k in text)
        ai_ratio = min(1.0, ai_hits / 6.0)
        # Title boost when role is explicitly AI-aligned
        title_l = job.title.lower()
        if any(x in title_l for x in ("ai", "ml", "machine learning", "llm", "generative")):
            ai_ratio = min(1.0, ai_ratio + 0.35)
        breakdown.ai_ml_llm_relevance = round(self.weights.get("ai_ml_llm_relevance", 15) * ai_ratio, 2)

        # Seniority alignment (10)
        breakdown.seniority_alignment = self._score_seniority(job, text)

        # Education (5)
        edu_weight = self.weights.get("education_alignment", 5)
        if self.profile.education and (
            "master" in (job.education_requirement or "").lower()
            or "computer science" in text
            or "ms " in text
            or "m.s" in text
            or "bachelor" in text
        ):
            breakdown.education_alignment = float(edu_weight)
        elif self.profile.education:
            breakdown.education_alignment = round(edu_weight * 0.8, 2)
        else:
            breakdown.education_alignment = 0.0

        # Location / arrangement (5)
        breakdown.location_arrangement = self._score_location(job)

        # Industry interest (5) — production AI signals
        industry_signals = ["production", "platform", "product", "customer", "saas", "api"]
        industry_hits = sum(1 for s in industry_signals if s in text)
        breakdown.industry_interest = round(
            self.weights.get("industry_interest", 5) * min(1.0, industry_hits / 3.0), 2
        )

        # Career growth (10)
        growth_signals = [" mentorship", "growth", "early career", "new grad", "junior", "associate"]
        growth = 0.55
        if any(s.strip() in text for s in growth_signals):
            growth = 0.9
        if any(x in title_l for x in ("senior", "staff", "principal", "lead")):
            growth = 0.35
        breakdown.career_growth = round(self.weights.get("career_growth", 10) * growth, 2)

        # Application practicality (5)
        practical = 0.7
        if job.application_url:
            practical += 0.2
        if job.is_staffing_repost:
            practical -= 0.4
        if not job.company_verified:
            practical -= 0.5
        breakdown.application_practicality = round(
            self.weights.get("application_practicality", 5) * max(0.0, min(1.0, practical)), 2
        )

        # Soft penalties
        penalty, reasons = self._soft_penalties(job, text)
        breakdown.penalties = penalty
        breakdown.penalty_reasons = reasons

        score = round(breakdown.total, 1)
        classification = classify_score(score)
        req_matches, missing_req, missing_pref, transferable = self._analyze_requirements(job)

        why = self._why_fits(job, breakdown, verified_techs)
        concerns = list(reasons)
        if job.sponsorship_language:
            concerns.append(f"Sponsorship language flagged for review: {job.sponsorship_language}")
        elif not job.work_authorization_language and not job.sponsorship_language:
            concerns.append("Sponsorship/work-authorization not mentioned — flag for review, do not auto-reject.")

        if not self.profile.resume_imported:
            concerns.append("Candidate resume not imported; do not submit applications yet.")

        priority = self._priority(classification, score)

        report = MatchReport(
            job_id=job.job_id,
            company=job.company,
            title=job.title,
            match_score=score,
            classification=classification,
            executive_recommendation=self._executive(classification, job, score),
            why_fits=why,
            strongest_qualifications=self._strongest(job),
            missing_required=missing_req,
            missing_preferred=missing_pref,
            transferable_skills=transferable,
            resume_changes_needed=self._resume_changes(job, missing_req),
            keywords_to_include=self._keywords(job),
            potential_concerns=concerns,
            work_authorization_language=job.work_authorization_language,
            sponsorship_language=job.sponsorship_language,
            likely_interview_topics=self._interview_topics(job),
            application_priority=priority,
            referral_would_help=score >= 75,
            requirement_matches=req_matches,
            score_breakdown=breakdown,
            assumptions=assumptions,
        )
        logger.info("Scored %s @ %s -> %s (%s)", job.title, job.company, score, classification.value)
        return report

    def _hard_reject(self, job: JobPosting) -> Optional[str]:
        if job.is_expired:
            return "Posting is expired"
        text = job.searchable_text()
        for pattern in self.rules.get("citizenship_clearance_patterns", []):
            if pattern.lower() in text or re.search(pattern, text, re.IGNORECASE):
                # Only reject citizenship/clearance hard requirements
                if any(
                    x in pattern.lower()
                    for x in ("citizen", "permanent resident", "green card", "clearance", "ts/sci", "secret")
                ):
                    snippet = job.citizenship_or_clearance_language or pattern
                    return f"Citizenship/clearance requirement: {snippet}"

        # Seniority hard reject for staff+/director titles
        title_l = job.title.lower()
        for kw in self.rules.get("seniority_reject_keywords", []):
            if kw in title_l:
                return f"Seniority beyond target experience: title contains '{kw}'"
        # Also reject common staff/principal title forms (e.g. "Staff Machine Learning Engineer")
        if re.search(
            r"\b(staff|principal|distinguished)\b.*\b(engineer|scientist|researcher)\b"
            r"|\b(director|vp|head of)\b",
            title_l,
        ):
            return f"Seniority beyond target experience: title '{job.title}'"

        # Payment scam heuristics
        if re.search(r"(?i)(application fee|pay (us|to apply)|wire transfer|crypto payment)", text):
            return "Suspicious payment request from applicants"

        if job.employment_type.value == "Full-time" and re.search(r"(?i)\bunpaid\b", text):
            return "Unpaid role presented as employment"

        return None

    def _score_seniority(self, job: JobPosting, text: str) -> float:
        weight = float(self.weights.get("seniority_alignment", 10))
        verified_years = self.profile.years_of_experience_verified
        required = job.experience_years_min

        title_l = job.title.lower()
        caution = any(kw in title_l or kw in text for kw in self.rules.get("seniority_caution_keywords", []))

        if required is not None and verified_years is not None:
            gap = required - verified_years
            if gap > 5:
                return 0.0
            if gap > 2:
                return round(weight * 0.35, 2)
            if gap > 0:
                return round(weight * 0.65, 2)
            return weight

        if caution and verified_years is None:
            return round(weight * 0.45, 2)
        if any(x in title_l for x in ("junior", "associate", "entry", "new grad")):
            return weight
        if any(x in title_l for x in ("ai engineer", "machine learning", "llm", "software engineer")):
            return round(weight * 0.75, 2)
        return round(weight * 0.6, 2)

    def _score_location(self, job: JobPosting) -> float:
        weight = float(self.weights.get("location_arrangement", 5))
        loc = (job.location or "").lower()
        if job.work_arrangement == WorkArrangement.REMOTE:
            return weight
        if "austin" in loc:
            return weight
        if "texas" in loc or "tx" in loc:
            return round(weight * 0.85, 2)
        if job.work_arrangement == WorkArrangement.HYBRID and ("texas" in loc or "austin" in loc):
            return round(weight * 0.9, 2)
        # Other strong U.S. markets — partial credit when highly AI-relevant title
        title_l = job.title.lower()
        if any(x in title_l for x in ("ai", "llm", "machine learning", "generative")):
            return round(weight * 0.55, 2)
        return round(weight * 0.3, 2)

    def _soft_penalties(self, job: JobPosting, text: str) -> tuple[float, list[str]]:
        penalty = 0.0
        reasons: list[str] = []
        verified_years = self.profile.years_of_experience_verified
        if (
            job.experience_years_min is not None
            and verified_years is not None
            and (job.experience_years_min - verified_years) > 5
        ):
            penalty += -20
            reasons.append("Required years exceed verified experience by more than 5")

        if not job.company_verified:
            penalty += -20
            reasons.append("Unclear or unverified employer")

        if job.is_staffing_repost:
            penalty += -10
            reasons.append("Staffing repost with weak client/role detail")

        # Major mandatory skill gaps when we have verified skills
        if self.profile.verified_technologies and job.required_qualifications:
            missing = 0
            for req in job.required_qualifications:
                tokens = [t for t in re.findall(r"[a-zA-Z][a-zA-Z0-9+.#]*", req.lower()) if len(t) > 2]
                tech_tokens = [t for t in tokens if t in {k.lower() for k in self.rules.get("core_skill_keywords", [])}]
                if tech_tokens and not any(
                    t in self.profile.verified_technologies or any(t in s for s in self.profile.verified_technologies)
                    for t in tech_tokens
                ):
                    missing += 1
            if missing:
                gap_pen = -min(20, 5 * missing)
                penalty += gap_pen
                reasons.append(f"Major mandatory skill gaps estimated: {missing} ({gap_pen})")

        return penalty, reasons

    def _analyze_requirements(
        self, job: JobPosting
    ) -> tuple[list[RequirementMatch], list[str], list[str], list[str]]:
        matches: list[RequirementMatch] = []
        missing_req: list[str] = []
        missing_pref: list[str] = []
        transferable: list[str] = []
        verified = self.profile.verified_technologies
        edu_blob = " ".join(
            f"{e.degree} {e.institution}" for e in self.profile.education
        ).lower()

        for req in job.required_qualifications:
            status, evidence = self._match_one(req, verified, edu_blob)
            matches.append(RequirementMatch(requirement=req, status=status, evidence=evidence))
            if status in {RequirementStatus.MISSING_LEARNABLE, RequirementStatus.MISSING_DISQUALIFYING}:
                missing_req.append(req)
            elif status == RequirementStatus.TRANSFERABLE:
                transferable.append(req)

        for req in job.preferred_qualifications:
            status, evidence = self._match_one(req, verified, edu_blob)
            matches.append(RequirementMatch(requirement=req, status=status, evidence=evidence))
            if status in {RequirementStatus.MISSING_LEARNABLE, RequirementStatus.MISSING_DISQUALIFYING}:
                missing_pref.append(req)
            elif status == RequirementStatus.TRANSFERABLE:
                transferable.append(req)

        return matches, missing_req, missing_pref, transferable

    def _match_one(
        self, requirement: str, verified: set[str], edu_blob: str
    ) -> tuple[RequirementStatus, str]:
        req_l = requirement.lower()
        if "computer science" in req_l or "master" in req_l or "bachelor" in req_l:
            if "computer science" in edu_blob or "master" in edu_blob:
                return RequirementStatus.FULLY_MATCHED, "Education on profile"
        if not verified:
            if any(k in req_l for k in ("python", "api", "machine learning", "llm", "ai")):
                return RequirementStatus.MISSING_LEARNABLE, "No verified skills imported yet"
            return RequirementStatus.MISSING_LEARNABLE, "Insufficient candidate skill data"

        tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9+.#]*", req_l)
        hits = [t for t in tokens if t in verified or any(t in s for s in verified)]
        if hits:
            return RequirementStatus.FULLY_MATCHED, f"Verified: {', '.join(hits[:5])}"
        if any(t in req_l for t in ("python", "api", "backend", "cloud")):
            return RequirementStatus.TRANSFERABLE, "Adjacent to target AI/backend direction"
        return RequirementStatus.MISSING_LEARNABLE, "Not found in verified inventory"

    def _why_fits(self, job: JobPosting, breakdown: ScoreBreakdown, techs: set[str]) -> list[str]:
        reasons: list[str] = []
        if breakdown.ai_ml_llm_relevance >= 8:
            reasons.append("Role is strongly aligned with AI/ML/LLM work")
        if "austin" in (job.location or "").lower() or job.work_arrangement == WorkArrangement.REMOTE:
            reasons.append("Location/work arrangement matches Austin or U.S. remote preference")
        if self.profile.education:
            reasons.append(
                f"Education fit: {self.profile.education[0].degree} from {self.profile.education[0].institution}"
            )
        if techs:
            reasons.append("Verified technical skills overlap with posting keywords")
        if not reasons:
            reasons.append("Partial alignment with target AI engineering direction")
        return reasons[:5]

    def _strongest(self, job: JobPosting) -> list[str]:
        items: list[str] = []
        if self.profile.education:
            e = self.profile.education[0]
            items.append(f"{e.degree}, {e.institution}")
        items.append(f"Target role alignment: {job.title}")
        if self.profile.work_authorization_status:
            items.append(f"Work authorization status on file: {self.profile.work_authorization_status} (confirm before answering)")
        return items

    def _resume_changes(self, job: JobPosting, missing_req: list[str]) -> list[str]:
        changes = [
            "Import and verify resume before finalizing any tailored version",
            f"Mirror accurate keywords from posting where experience supports them: {job.title}",
        ]
        if missing_req:
            changes.append("Do not fabricate missing required qualifications; note gaps honestly")
        return changes

    def _keywords(self, job: JobPosting) -> list[str]:
        keywords = set(job.technology_stack)
        for token in re.findall(r"\b(LLM|RAG|Python|FastAPI|AWS|GCP|MLOps|PyTorch|LangChain)\b", job.description, re.I):
            keywords.add(token)
        return sorted(keywords)[:20]

    def _interview_topics(self, job: JobPosting) -> list[str]:
        topics = ["Python fundamentals", "System design for AI features"]
        text = job.searchable_text()
        if "rag" in text:
            topics.append("RAG architecture and evaluation")
        if "llm" in text or "language model" in text:
            topics.append("LLM application patterns and failure modes")
        if "api" in text:
            topics.append("API design and backend reliability")
        if "aws" in text or "gcp" in text or "azure" in text:
            topics.append("Cloud deployment for ML/AI services")
        return topics

    def _priority(self, classification: MatchClassification, score: float) -> str:
        if classification in {MatchClassification.EXCEPTIONAL, MatchClassification.STRONG}:
            if not self.profile.resume_imported:
                return "Research further"
            return "Apply first"
        if classification == MatchClassification.POSSIBLE:
            return "Apply after small resume changes"
        if classification == MatchClassification.LOW_PRIORITY:
            return "Research further"
        return "Skip"

    def _executive(self, classification: MatchClassification, job: JobPosting, score: float) -> str:
        if classification == MatchClassification.EXCEPTIONAL:
            return f"Exceptional fit ({score}). Prioritize tailored application for {job.title} at {job.company}."
        if classification == MatchClassification.STRONG:
            return f"Strong fit ({score}). Prepare tailored resume and outreach for {job.company}."
        if classification == MatchClassification.POSSIBLE:
            return f"Possible fit ({score}). Analyze gaps before applying to {job.company}."
        if classification == MatchClassification.LOW_PRIORITY:
            return f"Low-priority stretch ({score}). Consider only if capacity allows."
        return f"Skip ({score}). Poor alignment or hard constraints."
