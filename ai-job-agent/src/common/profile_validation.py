"""Validate the candidate knowledge base for readiness and data quality."""

from __future__ import annotations

import re
from collections import Counter
from datetime import date
from typing import Any

from src.common.config import load_candidate_profile
from src.common.io import load_yaml
from src.common.paths import CANDIDATE_DIR
from src.common.profile_loader import load_candidate_knowledge_base
from src.common.resume_import import parse_month_year
from src.models.candidate import ClaimType, VerificationStatus


def validate_profile() -> dict[str, Any]:
    """Return a structured validation report and readiness percentage."""
    profile = load_candidate_knowledge_base()
    raw = load_candidate_profile()
    issues: list[dict[str, str]] = []

    # Missing required information
    required_checks = [
        ("full_name", bool(profile.full_name)),
        ("email", bool(profile.email)),
        ("phone", bool(profile.phone)),
        ("education", bool(profile.education)),
        ("experience", bool(profile.experiences)),
        ("skills", bool(profile.skills)),
        ("resume_imported", bool(profile.resume_imported)),
        ("profile_reviewed", bool(raw.get("profile_reviewed"))),
        ("profile_approved", bool(raw.get("profile_approved"))),
    ]
    for field, ok in required_checks:
        if not ok:
            issues.append(
                {
                    "severity": "missing_required",
                    "message": f"Missing required information: {field}",
                }
            )

    # Conflicting dates within experiences
    for exp in profile.experiences:
        start = parse_month_year(exp.start_date or "")
        end = parse_month_year(exp.end_date or "")
        if start and end:
            start_ord = start[0] * 12 + start[1]
            end_ord = end[0] * 12 + end[1]
            if end_ord < start_ord:
                issues.append(
                    {
                        "severity": "conflicting_dates",
                        "message": (
                            f"End date before start date for {exp.role} @ {exp.employer}: "
                            f"{exp.start_date} → {exp.end_date}"
                        ),
                    }
                )
        if exp.start_date and not exp.end_date:
            issues.append(
                {
                    "severity": "conflicting_dates",
                    "message": (
                        f"Single/open-ended date for {exp.role} @ {exp.employer} "
                        f"('{exp.start_date}') — confirm end date"
                    ),
                }
            )

    # Overlapping roles (informational)
    dated = []
    for exp in profile.experiences:
        s = parse_month_year(exp.start_date or "")
        end_raw = (exp.end_date or "").lower()
        if end_raw in {"present", "current"}:
            e = (date.today().year, date.today().month)
        else:
            e = parse_month_year(exp.end_date or "")

        if s and e:
            dated.append((exp, s[0] * 12 + s[1], e[0] * 12 + e[1]))
    for i, (a, a0, a1) in enumerate(dated):
        for b, b0, b1 in dated[i + 1 :]:
            if a0 <= b1 and b0 <= a1:
                issues.append(
                    {
                        "severity": "conflicting_dates",
                        "message": (
                            f"Overlapping employment periods: {a.employer} "
                            f"({a.start_date}–{a.end_date}) and {b.employer} "
                            f"({b.start_date}–{b.end_date})"
                        ),
                    }
                )

    # Duplicate skills
    skill_names = [s.name.strip().lower() for s in profile.skills]
    for name, count in Counter(skill_names).items():
        if count > 1:
            issues.append(
                {
                    "severity": "duplicate_skills",
                    "message": f"Duplicate skill: {name} ({count} entries)",
                }
            )

    # Unsupported claims
    for exp in profile.experiences:
        for item in exp.responsibilities + exp.measurable_results:
            if item.claim_type == ClaimType.UNSUPPORTED:
                issues.append(
                    {
                        "severity": "unsupported_claims",
                        "message": f"Unsupported claim under {exp.employer}: {item.text[:120]}",
                    }
                )

    # Unverified metrics
    ach_doc = load_yaml(CANDIDATE_DIR / "achievements.yaml")
    for ach in ach_doc.get("achievements") or []:
        if ach.get("metric") and ach.get("verification_status") in {
            None,
            "pending_review",
        }:
            issues.append(
                {
                    "severity": "unverified_metrics",
                    "message": f"Unverified metric '{ach.get('metric')}' in: {ach.get('text', '')[:120]}",
                }
            )
    for exp in profile.experiences:
        for item in exp.measurable_results:
            if item.metric and item.verification_status == VerificationStatus.PENDING_REVIEW:
                issues.append(
                    {
                        "severity": "unverified_metrics",
                        "message": f"Unverified metric '{item.metric}' @ {exp.employer}",
                    }
                )

    # Empty experience descriptions
    for exp in profile.experiences:
        if not exp.responsibilities and not exp.measurable_results:
            issues.append(
                {
                    "severity": "empty_experience_descriptions",
                    "message": f"Empty experience description: {exp.role} @ {exp.employer}",
                }
            )

    # Pending review facts
    pending = 0
    for exp in profile.experiences:
        if exp.verification_status == VerificationStatus.PENDING_REVIEW:
            pending += 1
        pending += sum(
            1
            for item in exp.responsibilities + exp.measurable_results
            if item.verification_status == VerificationStatus.PENDING_REVIEW
        )
    pending += sum(
        1 for s in profile.skills if s.verification_status == VerificationStatus.PENDING_REVIEW
    )
    if pending:
        issues.append(
            {
                "severity": "pending_review",
                "message": f"{pending} facts still pending review",
            }
        )

    readiness = _readiness_percentage(profile, raw, issues)
    by_severity: dict[str, list[str]] = {}
    for issue in issues:
        by_severity.setdefault(issue["severity"], []).append(issue["message"])

    return {
        "full_name": profile.full_name,
        "resume_imported": profile.resume_imported,
        "profile_reviewed": bool(raw.get("profile_reviewed")),
        "profile_approved": bool(raw.get("profile_approved")),
        "ready_for_tailoring": profile.is_ready_for_tailoring,
        "readiness_percentage": readiness,
        "counts": {
            "experiences": len(profile.experiences),
            "skills": len(profile.skills),
            "projects": len(profile.projects),
            "achievements": len(profile.achievements),
            "education": len(profile.education),
            "issues": len(issues),
        },
        "issues_by_severity": by_severity,
        "issues": issues,
    }


def _readiness_percentage(profile: Any, raw: dict[str, Any], issues: list[dict[str, str]]) -> int:
    score = 0
    checks = [
        bool(profile.full_name),
        bool(profile.email),
        bool(profile.phone),
        bool(profile.education),
        bool(profile.experiences),
        bool(profile.skills),
        bool(profile.resume_imported),
        bool(raw.get("profile_reviewed")),
        bool(raw.get("profile_approved")),
        not any(i["severity"] == "unsupported_claims" for i in issues),
        not any(i["severity"] == "empty_experience_descriptions" for i in issues),
        all(
            exp.responsibilities or exp.measurable_results
            for exp in profile.experiences
        )
        if profile.experiences
        else False,
    ]
    score = int(round(100 * sum(1 for c in checks if c) / len(checks)))
    # Soft penalty for many pending items
    pending_count = sum(1 for i in issues if i["severity"] == "pending_review")
    if pending_count:
        score = max(0, score - min(20, pending_count // 5))
    return score
