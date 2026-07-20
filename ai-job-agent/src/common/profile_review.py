"""Interactive (and scriptable) review of extracted candidate facts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from rich.console import Console
from rich.panel import Panel

from src.common.config import reload_config
from src.common.io import load_yaml, save_yaml
from src.common.paths import CANDIDATE_DIR, CONFIG_DIR

console = Console()


@dataclass
class ReviewFact:
    fact_id: str
    category: str
    summary: str
    detail: dict[str, Any]
    path_hint: str


@dataclass
class ReviewBundle:
    facts: list[ReviewFact]
    experiences: list[dict[str, Any]]
    skills: list[dict[str, Any]]
    projects: list[dict[str, Any]]
    achievements: list[dict[str, Any]]
    certifications: list[dict[str, Any]]
    exp_doc: dict[str, Any]
    skills_doc: dict[str, Any]
    projects_doc: dict[str, Any]
    ach_doc: dict[str, Any]
    cert_doc: dict[str, Any]


def load_review_bundle() -> ReviewBundle:
    """Load and flatten reviewable facts from candidate YAML files."""
    facts: list[ReviewFact] = []

    exp_doc = load_yaml(CANDIDATE_DIR / "verified_experience.yaml")
    experiences = list(exp_doc.get("experiences") or [])
    for i, exp in enumerate(experiences):
        facts.append(
            ReviewFact(
                fact_id=exp.get("id", f"exp_{i}"),
                category="experience",
                summary=(
                    f"{exp.get('role')} @ {exp.get('employer')} "
                    f"({exp.get('start_date')} – {exp.get('end_date')})"
                ),
                detail=exp,
                path_hint="verified_experience.yaml",
            )
        )
        for j, item in enumerate(exp.get("responsibilities") or []):
            facts.append(
                ReviewFact(
                    fact_id=f"{exp.get('id')}_resp_{j}",
                    category="responsibility",
                    summary=(item.get("text") or "")[:160],
                    detail=item,
                    path_hint=f"experience:{exp.get('id')}",
                )
            )
        for j, item in enumerate(exp.get("measurable_results") or []):
            facts.append(
                ReviewFact(
                    fact_id=f"{exp.get('id')}_metric_{j}",
                    category="measurable_result",
                    summary=(item.get("text") or "")[:160],
                    detail=item,
                    path_hint=f"experience:{exp.get('id')}",
                )
            )

    skills_doc = load_yaml(CANDIDATE_DIR / "skills_inventory.yaml")
    skills = list(skills_doc.get("skills") or [])
    for i, skill in enumerate(skills):
        facts.append(
            ReviewFact(
                fact_id=f"skill_{i}",
                category="skill",
                summary=f"{skill.get('name')} [{skill.get('category')}]",
                detail=skill,
                path_hint="skills_inventory.yaml",
            )
        )

    projects_doc = load_yaml(CANDIDATE_DIR / "project_inventory.yaml")
    projects = list(projects_doc.get("projects") or [])
    for i, proj in enumerate(projects):
        facts.append(
            ReviewFact(
                fact_id=proj.get("id", f"proj_{i}"),
                category="project",
                summary=proj.get("name", ""),
                detail=proj,
                path_hint="project_inventory.yaml",
            )
        )

    ach_doc = load_yaml(CANDIDATE_DIR / "achievements.yaml")
    achievements = list(ach_doc.get("achievements") or [])
    for i, ach in enumerate(achievements):
        facts.append(
            ReviewFact(
                fact_id=ach.get("id", f"ach_{i}"),
                category="achievement",
                summary=(ach.get("text") or "")[:160],
                detail=ach,
                path_hint="achievements.yaml",
            )
        )

    cert_doc = load_yaml(CANDIDATE_DIR / "certifications.yaml")
    certifications = list(cert_doc.get("certifications") or [])
    for i, cert in enumerate(certifications):
        facts.append(
            ReviewFact(
                fact_id=cert.get("id", f"cert_{i}"),
                category="certification",
                summary=f"{cert.get('name')} ({cert.get('issuer')})",
                detail=cert,
                path_hint="certifications.yaml",
            )
        )

    return ReviewBundle(
        facts=facts,
        experiences=experiences,
        skills=skills,
        projects=projects,
        achievements=achievements,
        certifications=certifications,
        exp_doc=exp_doc,
        skills_doc=skills_doc,
        projects_doc=projects_doc,
        ach_doc=ach_doc,
        cert_doc=cert_doc,
    )


def review_profile(
    *,
    interactive: bool = True,
    approve_all_pending: bool = False,
    mark_reviewed: bool = False,
    mark_approved: bool = False,
    input_fn: Callable[[str], str] | None = None,
) -> dict[str, Any]:
    """
    Review extracted facts.

    Actions per fact (interactive):
      a = approve
      c = correct
      r = reject
      p = mark private
      u = toggle can_include_in_resume
      m = record missing information
      s = skip
      q = quit
    """
    bundle = load_review_bundle()
    facts = bundle.facts
    if not facts:
        return {
            "reviewed_count": 0,
            "message": "No imported facts found. Run import-resume first.",
        }

    ask = input_fn or (lambda prompt: console.input(prompt))
    stats = {
        "total": len(facts),
        "approved": 0,
        "corrected": 0,
        "rejected": 0,
        "private": 0,
        "skipped": 0,
        "added": 0,
    }

    if approve_all_pending:
        for fact in facts:
            if fact.detail.get("claim_type") == "unsupported":
                fact.detail["verification_status"] = "rejected"
                fact.detail["can_include_in_resume"] = False
                stats["rejected"] += 1
            elif fact.detail.get("verification_status", "pending_review") == "pending_review":
                fact.detail["verification_status"] = "approved"
                fact.detail["can_include_in_resume"] = not fact.detail.get("is_private", False)
                stats["approved"] += 1
            else:
                stats["skipped"] += 1
    elif interactive:
        console.print(
            Panel.fit(
                "Profile review\n"
                "[a]pprove  [c]orrect  [r]eject  [p]rivate  "
                "[u]se-in-resume toggle  [m]issing-info  [s]kip  [q]uit",
                title="review-profile",
            )
        )
        for fact in facts:
            status = fact.detail.get("verification_status", "pending_review")
            console.print(
                f"\n[bold]{fact.category}[/bold] ({fact.fact_id}) "
                f"status={status} include={fact.detail.get('can_include_in_resume')} "
                f"private={fact.detail.get('is_private')}"
            )
            console.print(fact.summary)
            if fact.detail.get("supporting_text"):
                console.print(
                    f"[dim]source: {fact.detail.get('source_file')} / "
                    f"{fact.detail.get('source_section')}[/dim]"
                )
                console.print(f"[dim]{str(fact.detail.get('supporting_text'))[:240]}[/dim]")
            if fact.detail.get("requires_user_confirmation"):
                console.print(
                    f"[yellow]needs confirmation:[/yellow] "
                    f"{fact.detail.get('confirmation_reason')}"
                )
            choice = ask("Action [a/c/r/p/u/m/s/q]: ").strip().lower() or "s"
            if choice == "q":
                break
            if choice == "a":
                fact.detail["verification_status"] = "approved"
                fact.detail["can_include_in_resume"] = not fact.detail.get("is_private", False)
                stats["approved"] += 1
            elif choice == "c":
                new_text = ask("Enter corrected text/value: ").strip()
                if not new_text:
                    stats["skipped"] += 1
                    continue
                if "text" in fact.detail:
                    fact.detail["text"] = new_text
                elif "name" in fact.detail and fact.category in {
                    "skill",
                    "project",
                    "certification",
                }:
                    fact.detail["name"] = new_text
                elif fact.category == "experience":
                    field = ask(
                        "Field to correct [role/employer/start_date/end_date/location]: "
                    ).strip()
                    if field in fact.detail:
                        fact.detail[field] = new_text
                fact.detail["verification_status"] = "corrected"
                fact.detail["requires_user_confirmation"] = False
                stats["corrected"] += 1
            elif choice == "r":
                fact.detail["verification_status"] = "rejected"
                fact.detail["can_include_in_resume"] = False
                stats["rejected"] += 1
            elif choice == "p":
                fact.detail["is_private"] = True
                fact.detail["verification_status"] = "private"
                fact.detail["can_include_in_resume"] = False
                stats["private"] += 1
            elif choice == "u":
                current = bool(fact.detail.get("can_include_in_resume", True))
                fact.detail["can_include_in_resume"] = not current
                console.print(f"can_include_in_resume -> {fact.detail['can_include_in_resume']}")
                stats["skipped"] += 1
            elif choice == "m":
                note = ask("Missing information to record: ").strip()
                if note:
                    profile = load_yaml(CONFIG_DIR / "candidate_profile.yaml")
                    profile.setdefault("profile_notes", [])
                    profile["profile_notes"].append(f"MISSING: {note}")
                    save_yaml(CONFIG_DIR / "candidate_profile.yaml", profile)
                    stats["added"] += 1
                else:
                    stats["skipped"] += 1
            else:
                stats["skipped"] += 1
    else:
        for fact in facts:
            console.print(f"- [{fact.category}] {fact.fact_id}: {fact.summary}")
            stats["skipped"] += 1

    _save_bundle(bundle)

    profile = load_yaml(CONFIG_DIR / "candidate_profile.yaml")
    if mark_reviewed or approve_all_pending or stats["approved"] or stats["corrected"]:
        profile["profile_reviewed"] = True
    if mark_approved:
        if not profile.get("profile_reviewed"):
            raise ValueError("Cannot approve profile before review is marked complete.")
        profile["profile_approved"] = True
    save_yaml(CONFIG_DIR / "candidate_profile.yaml", profile)
    reload_config()

    return {
        "stats": stats,
        "profile_reviewed": bool(profile.get("profile_reviewed")),
        "profile_approved": bool(profile.get("profile_approved")),
        "next_step": (
            "python -m src.cli validate-profile"
            if profile.get("profile_reviewed")
            else "Continue review-profile until facts are approved"
        ),
    }


def add_missing_fact(
    *,
    category: str,
    text: str,
    can_include_in_resume: bool = True,
    is_private: bool = False,
) -> dict[str, Any]:
    """Append a user-provided fact that was missing from the resume import."""
    if category == "skill":
        doc = load_yaml(CANDIDATE_DIR / "skills_inventory.yaml")
        skills = list(doc.get("skills") or [])
        skills.append(
            {
                "name": text,
                "category": "other",
                "source_file": "user_provided",
                "source_section": "manual_add",
                "supporting_text": text,
                "confidence": "high",
                "verification_status": "approved",
                "can_include_in_resume": can_include_in_resume and not is_private,
                "is_private": is_private,
                "claim_type": "verified_fact",
                "requires_user_confirmation": False,
                "contexts": [],
            }
        )
        doc["skills"] = skills
        save_yaml(CANDIDATE_DIR / "skills_inventory.yaml", doc)
    elif category == "achievement":
        doc = load_yaml(CANDIDATE_DIR / "achievements.yaml")
        ach = list(doc.get("achievements") or [])
        ach.append(
            {
                "id": f"ach_manual_{len(ach)+1:03d}",
                "text": text,
                "metric": None,
                "source_file": "user_provided",
                "source_section": "manual_add",
                "supporting_text": text,
                "confidence": "high",
                "verification_status": "approved",
                "can_include_in_resume": can_include_in_resume and not is_private,
                "is_private": is_private,
                "claim_type": "verified_fact",
            }
        )
        doc["achievements"] = ach
        save_yaml(CANDIDATE_DIR / "achievements.yaml", doc)
    else:
        raise ValueError("Manual add currently supports category=skill|achievement")
    reload_config()
    return {"added": True, "category": category, "text": text}


def _save_bundle(bundle: ReviewBundle) -> None:
    bundle.exp_doc["experiences"] = bundle.experiences
    save_yaml(CANDIDATE_DIR / "verified_experience.yaml", bundle.exp_doc)

    bundle.skills_doc["skills"] = bundle.skills
    save_yaml(CANDIDATE_DIR / "skills_inventory.yaml", bundle.skills_doc)

    bundle.projects_doc["projects"] = bundle.projects
    save_yaml(CANDIDATE_DIR / "project_inventory.yaml", bundle.projects_doc)

    bundle.ach_doc["achievements"] = bundle.achievements
    save_yaml(CANDIDATE_DIR / "achievements.yaml", bundle.ach_doc)

    bundle.cert_doc = bundle.cert_doc or {}
    bundle.cert_doc["certifications"] = bundle.certifications
    bundle.cert_doc.setdefault("schema_version", "1.1")
    bundle.cert_doc.setdefault("resume_imported", True)
    save_yaml(CANDIDATE_DIR / "certifications.yaml", bundle.cert_doc)
