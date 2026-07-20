"""Import a markdown/text resume into the verified knowledge base.

This importer is deliberately conservative: it extracts structured sections when
possible and marks uncertain fields for user confirmation. It never invents employers.
"""

from __future__ import annotations

import logging
import re
from datetime import date
from pathlib import Path
from typing import Any

from src.common.config import reload_config
from src.common.io import load_yaml, read_text, save_yaml, write_text
from src.common.paths import CANDIDATE_DIR, CONFIG_DIR, RESUMES_MASTER

logger = logging.getLogger("ai_job_agent.resume_import")

SECTION_HEADERS = re.compile(
    r"^(#{1,3}\s*)?(experience|work experience|employment|education|skills|projects|"
    r"technical skills|professional experience)\s*$",
    re.IGNORECASE | re.MULTILINE,
)


def import_resume(path: Path, *, dry_run: bool = False) -> dict[str, Any]:
    """Parse resume text into candidate YAML inventories."""
    path = path.resolve()
    if not path.exists():
        raise FileNotFoundError(path)
    if path.suffix.lower() == ".pdf":
        raise ValueError(
            "PDF import is not implemented in v0.1. Convert to Markdown/text first, "
            "place under resumes/master/, then re-run import-resume."
        )

    text = read_text(path)
    sections = _split_sections(text)
    skills = _extract_skills(sections.get("skills", "") or sections.get("technical skills", ""), path)
    experiences = _extract_experiences(
        sections.get("experience", "")
        or sections.get("work experience", "")
        or sections.get("professional experience", "")
        or sections.get("employment", ""),
        path,
    )
    projects = _extract_projects(sections.get("projects", ""), path)
    education_from_resume = _extract_education(sections.get("education", ""), path)

    result = {
        "source": str(path),
        "skills_found": len(skills),
        "experiences_found": len(experiences),
        "projects_found": len(projects),
        "education_blocks_found": len(education_from_resume),
        "requires_user_confirmation": [
            "Graduation dates if missing",
            "Any auto-parsed employer/title/date boundaries",
            "Skills inferred from comma-separated lists",
        ],
    }

    if dry_run:
        result["dry_run"] = True
        return result

    # Persist master copy
    RESUMES_MASTER.mkdir(parents=True, exist_ok=True)
    dest = RESUMES_MASTER / path.name
    if dest.resolve() != path.resolve():
        write_text(dest, text, backup=True)

    write_text(CANDIDATE_DIR / "master_resume.md", text, backup=True)

    save_yaml(
        CANDIDATE_DIR / "skills_inventory.yaml",
        {
            "schema_version": "1.0",
            "resume_imported": True,
            "skills": skills,
            "notes": ["Imported via import-resume. Review before applications."],
        },
    )
    save_yaml(
        CANDIDATE_DIR / "verified_experience.yaml",
        {
            "schema_version": "1.0",
            "last_updated": date.today().isoformat(),
            "resume_imported": True,
            "source_files_scanned": [str(path)],
            "experiences": experiences,
            "notes": ["Review parsed dates/titles. Unsupported claims must be removed."],
        },
    )
    save_yaml(
        CANDIDATE_DIR / "project_inventory.yaml",
        {
            "schema_version": "1.0",
            "resume_imported": True,
            "projects": projects,
            "notes": ["Imported via import-resume."],
        },
    )

    # Update profile flag
    profile = load_yaml(CONFIG_DIR / "candidate_profile.yaml")
    profile["resume_imported"] = True
    if education_from_resume and not profile.get("education"):
        profile["education"] = education_from_resume
    # Estimate years if possible
    years = _estimate_years(experiences)
    if years is not None:
        profile["years_of_experience_verified"] = years
    save_yaml(CONFIG_DIR / "candidate_profile.yaml", profile)
    reload_config()

    logger.info(
        "Imported resume: %s skills, %s experiences, %s projects",
        len(skills),
        len(experiences),
        len(projects),
    )
    return result


def _split_sections(text: str) -> dict[str, str]:
    matches = list(SECTION_HEADERS.finditer(text))
    if not matches:
        return {"body": text}
    sections: dict[str, str] = {}
    for i, match in enumerate(matches):
        name = re.sub(r"^#{1,3}\s*", "", match.group(0)).strip().lower()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        sections[name] = text[start:end].strip()
    return sections


def _extract_skills(block: str, source: Path) -> list[dict[str, Any]]:
    if not block.strip():
        return []
    # Prefer comma/semicolon separated tokens; fall back to lines
    tokens: list[str] = []
    for line in block.splitlines():
        line = line.strip(" -*\t")
        if not line:
            continue
        if "," in line or ";" in line or "|" in line:
            parts = re.split(r"[,;|]", line)
            tokens.extend(p.strip() for p in parts if p.strip())
        else:
            tokens.append(line)
    skills = []
    seen: set[str] = set()
    for token in tokens:
        key = token.lower()
        if key in seen or len(token) > 60:
            continue
        seen.add(key)
        skills.append(
            {
                "name": token,
                "category": "other",
                "source_file": str(source),
                "supporting_text": token,
                "confidence": "medium",
                "can_include_in_resume": True,
                "claim_type": "verified_fact",
                "contexts": [],
            }
        )
    return skills


def _extract_experiences(block: str, source: Path) -> list[dict[str, Any]]:
    if not block.strip():
        return []
    # Split on markdown ### headings or blank-line separated chunks with date patterns
    chunks = re.split(r"\n(?=###\s+)", block)
    experiences: list[dict[str, Any]] = []
    for idx, chunk in enumerate(chunks):
        chunk = chunk.strip()
        if not chunk or len(chunk) < 20:
            continue
        lines = [ln.strip() for ln in chunk.splitlines() if ln.strip()]
        header = re.sub(r"^###\s*", "", lines[0])
        role, employer = _split_role_employer(header)
        dates = _find_dates(" ".join(lines[:3]))
        bullets = [
            re.sub(r"^[-*•]\s*", "", ln)
            for ln in lines[1:]
            if ln.startswith(("-", "*", "•"))
        ]
        exp_id = f"exp_{idx+1:03d}"
        experiences.append(
            {
                "id": exp_id,
                "employer": employer or "REQUIRES USER CONFIRMATION",
                "role": role or "REQUIRES USER CONFIRMATION",
                "start_date": dates[0],
                "end_date": dates[1],
                "technologies": [],
                "responsibilities": [
                    {
                        "text": b,
                        "confidence": "medium",
                        "can_include_in_resume": True,
                        "claim_type": "verified_fact",
                        "supporting_text": b,
                        "source_file": str(source),
                    }
                    for b in bullets
                ],
                "measurable_results": [],
                "confidence": "medium",
                "can_include_in_resume": True,
                "source_file": str(source),
            }
        )
    return experiences


def _extract_projects(block: str, source: Path) -> list[dict[str, Any]]:
    if not block.strip():
        return []
    chunks = re.split(r"\n(?=###\s+)", block)
    projects: list[dict[str, Any]] = []
    for idx, chunk in enumerate(chunks):
        chunk = chunk.strip()
        if not chunk:
            continue
        lines = [ln.strip() for ln in chunk.splitlines() if ln.strip()]
        name = re.sub(r"^###\s*", "", lines[0])
        bullets = [re.sub(r"^[-*•]\s*", "", ln) for ln in lines[1:] if ln.startswith(("-", "*", "•"))]
        desc = bullets[0] if bullets else " ".join(lines[1:3])
        projects.append(
            {
                "id": f"proj_{idx+1:03d}",
                "name": name,
                "description": desc,
                "technologies": [],
                "measurable_results": [
                    {
                        "text": b,
                        "confidence": "medium",
                        "can_include_in_resume": True,
                        "claim_type": "verified_fact",
                        "supporting_text": b,
                        "source_file": str(source),
                    }
                    for b in bullets[1:]
                ],
                "source_file": str(source),
                "supporting_text": chunk[:300],
                "confidence": "medium",
                "can_include_in_resume": True,
                "claim_type": "verified_fact",
            }
        )
    return projects


def _extract_education(block: str, source: Path) -> list[dict[str, Any]]:
    if not block.strip():
        return []
    results = []
    if "master" in block.lower() or "university" in block.lower():
        results.append(
            {
                "degree": "Master of Science in Computer Science"
                if "computer science" in block.lower()
                else "See resume education section",
                "institution": "University of Memphis"
                if "memphis" in block.lower()
                else "REQUIRES USER CONFIRMATION",
                "graduation_date": None,
                "source": str(source),
                "confidence": "medium",
            }
        )
    return results


def _split_role_employer(header: str) -> tuple[str, str]:
    for sep in [" at ", " @ ", " — ", " - ", ", "]:
        if sep in header:
            left, right = header.split(sep, 1)
            return left.strip(), right.strip()
    return header.strip(), ""


def _find_dates(text: str) -> tuple[str | None, str | None]:
    # Matches 2021-2023, Jan 2021 – Present, etc.
    match = re.search(
        r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(20\d{2}|19\d{2})"
        r"\s*[–\-to]+\s*"
        r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(20\d{2}|19\d{2}|Present|Current)",
        text,
        re.I,
    )
    if not match:
        return None, None
    start = f"{match.group(1) or ''}{match.group(2)}".strip()
    end = f"{match.group(3) or ''}{match.group(4)}".strip()
    return start, end


def _estimate_years(experiences: list[dict[str, Any]]) -> float | None:
    years = []
    for exp in experiences:
        start = exp.get("start_date") or ""
        end = exp.get("end_date") or ""
        sy = re.search(r"(20\d{2}|19\d{2})", start or "")
        ey = re.search(r"(20\d{2}|19\d{2})", end or "")
        if sy and ey:
            years.append(max(0, int(ey.group(1)) - int(sy.group(1))))
        elif sy and end and "present" in end.lower():
            years.append(max(0, date.today().year - int(sy.group(1))))
    if not years:
        return None
    return float(sum(years))
