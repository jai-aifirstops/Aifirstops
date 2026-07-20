"""Import PDF/DOCX/Markdown/TXT resumes into the verified knowledge base."""

from __future__ import annotations

import logging
import re
from datetime import date
from pathlib import Path
from typing import Any, Optional

from src.common.config import reload_config
from src.common.io import load_yaml, save_yaml, write_text
from src.common.paths import CANDIDATE_DIR, CONFIG_DIR, RESUMES_MASTER
from src.common.resume_discovery import discover_resume
from src.common.resume_readers import extract_resume_text

logger = logging.getLogger("ai_job_agent.resume_import")

SECTION_ALIASES = {
    "summary": "summary",
    "professional summary": "summary",
    "education": "education",
    "work experience": "experience",
    "professional experience": "experience",
    "experience": "experience",
    "employment": "experience",
    "technical skills": "skills",
    "skills": "skills",
    "projects": "projects",
    "personal projects": "projects",
    "certifications": "certifications",
    "certificates": "certifications",
    "technical leadership": "leadership",
    "leadership": "leadership",
    "achievements": "achievements",
    "accomplishments": "achievements",
}

SECTION_HEADER_RE = re.compile(
    r"^(?:#{1,3}\s*)?("
    + "|".join(re.escape(k) for k in sorted(SECTION_ALIASES, key=len, reverse=True))
    + r")\s*$",
    re.IGNORECASE | re.MULTILINE,
)

DATE_RANGE_RE = re.compile(
    r"(?P<start>(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})"
    r"\s*[–\-—to]+\s*"
    r"(?P<end>(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|Present|Current)",
    re.IGNORECASE,
)
SINGLE_DATE_RE = re.compile(
    r"\b(?P<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(?P<year>\d{4})\b",
    re.IGNORECASE,
)
SEASON_DATE_RE = re.compile(
    r"\b(?P<season>Spring|Summer|Fall|Autumn|Winter)\s+(?P<year>\d{4})\b",
    re.IGNORECASE,
)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
METRIC_RE = re.compile(
    r"("
    r"\d+(?:\.\d+)?\s*%|"
    r"\$\s?\d+(?:,\d{3})*(?:\.\d+)?[kKmMbB]?|"
    r"\b\d+(?:\.\d+)?\s*x\b|"
    r"\b\d+(?:,\d{3})+\b"
    r")",
    re.IGNORECASE,
)
LOCATION_RE = re.compile(
    r"\b([A-Z][A-Za-z .'-]+,\s*(?:[A-Z]{2}|[A-Za-z]+(?:,\s*[A-Za-z]+)?))\b"
)


def import_resume(
    path: Path | None = None,
    *,
    auto: bool = False,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Parse a resume file into candidate YAML inventories."""
    if auto and path is not None:
        raise ValueError("Pass either a path or --auto, not both.")
    if auto:
        path = discover_resume()
    if path is None:
        raise ValueError("Resume path is required unless --auto is set.")

    path = path.resolve()
    text = extract_resume_text(path)
    source_name = path.name
    sections = split_sections(text)

    contact = extract_contact(text, source_name)
    education = extract_education(sections.get("education", ""), source_name)
    experiences = extract_experiences(sections.get("experience", ""), source_name)
    # Leadership entries that look like roles can be kept as experience-adjacent projects
    leadership_projects = extract_leadership_as_projects(sections.get("leadership", ""), source_name)
    projects = extract_projects(sections.get("projects", ""), source_name) + leadership_projects
    skills = extract_skills(sections.get("skills", ""), source_name)
    certifications = extract_certifications(sections.get("certifications", ""), source_name)
    achievements = extract_achievements(experiences, projects, source_name)

    confirmation_items = _collect_confirmations(contact, education, experiences, skills)

    result: dict[str, Any] = {
        "source": str(path),
        "source_filename": source_name,
        "format": path.suffix.lower(),
        "contact": contact,
        "skills_found": len(skills),
        "experiences_found": len(experiences),
        "projects_found": len(projects),
        "education_blocks_found": len(education),
        "certifications_found": len(certifications),
        "achievements_found": len(achievements),
        "requires_user_confirmation": confirmation_items,
        "profile_reviewed": False,
        "profile_approved": False,
        "next_step": "python -m src.cli review-profile",
    }

    if dry_run:
        result["dry_run"] = True
        result["preview"] = {
            "education": education,
            "experiences": experiences,
            "skills_sample": skills[:10],
            "certifications": certifications,
            "projects": projects,
            "achievements_sample": achievements[:5],
        }
        return result

    _persist_import(
        path=path,
        text=text,
        contact=contact,
        education=education,
        experiences=experiences,
        skills=skills,
        projects=projects,
        certifications=certifications,
        achievements=achievements,
        confirmation_items=confirmation_items,
    )
    reload_config()
    logger.info(
        "Imported %s: %s experiences, %s skills, %s projects, %s certifications",
        source_name,
        len(experiences),
        len(skills),
        len(projects),
        len(certifications),
    )
    return result


def split_sections(text: str) -> dict[str, str]:
    matches = list(SECTION_HEADER_RE.finditer(text))
    if not matches:
        return {"body": text}
    sections: dict[str, str] = {}
    for i, match in enumerate(matches):
        raw_name = match.group(1).strip().lower()
        key = SECTION_ALIASES.get(raw_name, raw_name)
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        # Prefer first occurrence; append if duplicate headers
        chunk = text[start:end].strip()
        if key in sections and sections[key]:
            sections[key] = sections[key] + "\n\n" + chunk
        else:
            sections[key] = chunk
    return sections


def extract_contact(text: str, source_name: str) -> dict[str, Any]:
    head = "\n".join(text.splitlines()[:12])
    email_match = EMAIL_RE.search(head) or EMAIL_RE.search(text)
    phone_match = PHONE_RE.search(head) or PHONE_RE.search(text)
    name = None
    for line in text.splitlines()[:5]:
        if not line or line.lower() in SECTION_ALIASES:
            continue
        if EMAIL_RE.search(line) or PHONE_RE.search(line):
            continue
        if re.search(r"developer|engineer|architect|student", line, re.I) and len(line) > 40:
            continue
        # Likely name: 2-4 capitalized words
        if re.match(r"^[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3}$", line):
            name = line.title() if line.isupper() else line
            break

    location_city = None
    location_state = None
    loc_match = re.search(
        r"\b([A-Za-z .'-]+),\s*([A-Z]{2})\b",
        head,
    )
    if loc_match:
        location_city = loc_match.group(1).strip().title()
        location_state = loc_match.group(2).upper()

    return {
        "full_name": name,
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0) if phone_match else None,
        "location_city": location_city,
        "location_state": location_state,
        "source_file": source_name,
        "source_section": "header",
        "supporting_text": head[:500],
        "confidence": "high" if name and email_match else "medium",
        "verification_status": "pending_review",
        "requires_user_confirmation": bool(
            not name or not email_match or not location_city
        ),
    }


def extract_education(block: str, source_name: str) -> list[dict[str, Any]]:
    if not block.strip():
        return []
    lines = [ln for ln in block.splitlines() if ln.strip()]
    records: list[dict[str, Any]] = []
    i = 0
    idx = 0
    while i < len(lines):
        line = lines[i]
        dates = parse_dates(line)
        institution = DATE_RANGE_RE.sub("", line)
        institution = SINGLE_DATE_RE.sub("", institution).strip(" |,-")
        # Degree often on next line
        degree = ""
        if i + 1 < len(lines) and not DATE_RANGE_RE.search(lines[i + 1]):
            nxt = lines[i + 1]
            if not nxt.startswith(("•", "-", "*")) and len(nxt) < 120:
                degree = nxt.strip()
                i += 1
        if institution and (
            "university" in institution.lower()
            or "college" in institution.lower()
            or "institute" in institution.lower()
            or degree
        ):
            idx += 1
            uncertain_dates = dates[0] is None
            records.append(
                {
                    "degree": degree or "REQUIRES USER CONFIRMATION",
                    "institution": institution,
                    "location": None,
                    "start_date": dates[0],
                    "graduation_date": dates[1],
                    "gpa": None,
                    "source": source_name,
                    "source_file": source_name,
                    "source_section": "education",
                    "supporting_text": f"{line}" + (f" | {degree}" if degree else ""),
                    "confidence": "high" if degree and dates[0] else "medium",
                    "verification_status": "pending_review",
                    "can_include_in_resume": True,
                    "is_private": False,
                    "claim_type": "verified_fact",
                    "requires_user_confirmation": uncertain_dates or not degree,
                    "confirmation_reason": (
                        "Education dates or degree wording need confirmation"
                        if uncertain_dates or not degree
                        else None
                    ),
                }
            )
        i += 1
    return records


def extract_experiences(block: str, source_name: str) -> list[dict[str, Any]]:
    if not block.strip():
        return []
    # Markdown ### chunks
    if re.search(r"^###\s+", block, re.M):
        return _extract_experiences_markdown(block, source_name)
    return _extract_experiences_plain(block, source_name)


def _extract_experiences_plain(block: str, source_name: str) -> list[dict[str, Any]]:
    lines = [ln.rstrip() for ln in block.splitlines()]
    experiences: list[dict[str, Any]] = []
    i = 0
    exp_idx = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        date_info = parse_dates(line)
        has_range = DATE_RANGE_RE.search(line) is not None
        has_single = (not has_range) and SINGLE_DATE_RE.search(line) is not None
        has_season = (not has_range and not has_single) and SEASON_DATE_RE.search(line) is not None
        if not has_range and not has_single and not has_season:
            i += 1
            continue

        employer = DATE_RANGE_RE.sub("", line)
        employer = SINGLE_DATE_RE.sub("", employer)
        employer = SEASON_DATE_RE.sub("", employer).strip(" |,-")
        if not employer or employer.startswith(("•", "-", "*")):
            i += 1
            continue

        role = ""
        location = None
        if i + 1 < len(lines):
            role_line = lines[i + 1].strip()
            if role_line and not role_line.startswith(("•", "-", "*")):
                role, location = _split_role_location(role_line)
                i += 1

        bullets: list[str] = []
        j = i + 1
        while j < len(lines):
            nxt = lines[j].strip()
            if not nxt:
                # allow one blank inside bullet block
                if j + 1 < len(lines) and lines[j + 1].strip().startswith(("•", "-", "*")):
                    j += 1
                    continue
                break
            if DATE_RANGE_RE.search(nxt) or (
                (SINGLE_DATE_RE.search(nxt) or SEASON_DATE_RE.search(nxt))
                and not nxt.startswith(("•", "-", "*"))
                and len(nxt) < 120
            ):
                # Likely next employer header
                break
            if nxt.startswith(("•", "-", "*")):
                bullets.append(re.sub(r"^[-*•]\s*", "", nxt))
                j += 1
                continue
            # Continuation of previous bullet
            if bullets and not re.match(r"^[A-Z][A-Za-z0-9 &()/.,+-]{2,40}$", nxt):
                bullets[-1] = bullets[-1] + " " + nxt
                j += 1
                continue
            break

        exp_idx += 1
        start, end = date_info
        uncertain = False
        confirmation_reason = None
        if has_single and not has_range:
            # Preserve exact single date; do not invent an end date
            start = start or (SINGLE_DATE_RE.search(line).group(0) if SINGLE_DATE_RE.search(line) else None)
            end = end  # may be None
            uncertain = end is None
            confirmation_reason = (
                f"Only a single date was found on the resume ('{start}'). "
                "Confirm whether this role is ongoing and the correct end date."
            )

        responsibilities, measurable = _split_bullets(bullets, source_name, "experience")
        experiences.append(
            {
                "id": f"exp_{exp_idx:03d}",
                "employer": employer,
                "role": role or "REQUIRES USER CONFIRMATION",
                "start_date": start,
                "end_date": end,
                "location": location,
                "employment_type": _infer_employment_type(role),
                "technologies": _infer_technologies_from_text(" ".join(bullets) + " " + role),
                "responsibilities": responsibilities,
                "measurable_results": measurable,
                "industry_domain": None,
                "source_file": source_name,
                "source_section": "experience",
                "supporting_text": f"{employer} | {role} | {start} – {end}",
                "confidence": "high" if role and start and responsibilities else "medium",
                "verification_status": "pending_review",
                "can_include_in_resume": True,
                "is_private": False,
                "claim_type": "verified_fact",
                "requires_user_confirmation": uncertain or not role,
                "confirmation_reason": confirmation_reason,
            }
        )
        i = j
    return experiences


def _extract_experiences_markdown(block: str, source_name: str) -> list[dict[str, Any]]:
    chunks = re.split(r"\n(?=###\s+)", block)
    experiences: list[dict[str, Any]] = []
    for idx, chunk in enumerate(chunks):
        chunk = chunk.strip()
        if not chunk:
            continue
        lines = [ln.strip() for ln in chunk.splitlines() if ln.strip()]
        header = re.sub(r"^###\s*", "", lines[0])
        role, employer = _split_role_employer(header)
        dates = parse_dates(" ".join(lines[:3]))
        location = None
        for ln in lines[1:3]:
            if not ln.startswith(("•", "-", "*")) and ("," in ln or dates[0] and dates[0] in ln):
                loc_candidate = DATE_RANGE_RE.sub("", ln)
                loc_candidate = SINGLE_DATE_RE.sub("", loc_candidate).strip(" |,-")
                if loc_candidate and loc_candidate.lower() not in {role.lower(), employer.lower()}:
                    location = loc_candidate or None
        bullets = [re.sub(r"^[-*•]\s*", "", ln) for ln in lines[1:] if ln.startswith(("-", "*", "•"))]
        responsibilities, measurable = _split_bullets(bullets, source_name, "experience")
        experiences.append(
            {
                "id": f"exp_{idx+1:03d}",
                "employer": employer or "REQUIRES USER CONFIRMATION",
                "role": role or "REQUIRES USER CONFIRMATION",
                "start_date": dates[0],
                "end_date": dates[1],
                "location": location,
                "employment_type": _infer_employment_type(role),
                "technologies": _infer_technologies_from_text(" ".join(bullets) + " " + role),
                "responsibilities": responsibilities,
                "measurable_results": measurable,
                "source_file": source_name,
                "source_section": "experience",
                "supporting_text": chunk[:400],
                "confidence": "medium",
                "verification_status": "pending_review",
                "can_include_in_resume": True,
                "is_private": False,
                "claim_type": "verified_fact",
                "requires_user_confirmation": not employer or not role or not dates[0],
                "confirmation_reason": (
                    "Parsed from markdown heading; confirm employer/title/dates"
                    if not employer or not role or not dates[0]
                    else None
                ),
            }
        )
    return experiences


def extract_projects(block: str, source_name: str) -> list[dict[str, Any]]:
    if not block.strip():
        return []
    if re.search(r"^###\s+", block, re.M):
        chunks = re.split(r"\n(?=###\s+)", block)
    else:
        # Split on blank lines into project-like chunks with bullets
        chunks = re.split(r"\n\s*\n", block)
    projects: list[dict[str, Any]] = []
    for idx, chunk in enumerate(chunks):
        chunk = chunk.strip()
        if not chunk:
            continue
        lines = [ln.strip() for ln in chunk.splitlines() if ln.strip()]
        name = re.sub(r"^###\s*", "", lines[0])
        name = DATE_RANGE_RE.sub("", name).strip(" |,-")
        bullets = [re.sub(r"^[-*•]\s*", "", ln) for ln in lines[1:] if ln.startswith(("-", "*", "•"))]
        if not bullets and len(lines) == 1:
            continue
        dates = parse_dates(chunk)
        date_str = " – ".join(x for x in dates if x) or None
        _, measurable = _split_bullets(bullets, source_name, "projects")
        projects.append(
            {
                "id": f"proj_{idx+1:03d}",
                "name": name,
                "role": None,
                "dates": date_str,
                "technologies": _infer_technologies_from_text(chunk),
                "description": bullets[0] if bullets else "",
                "measurable_results": measurable,
                "source_file": source_name,
                "source_section": "projects",
                "supporting_text": chunk[:400],
                "confidence": "medium",
                "verification_status": "pending_review",
                "can_include_in_resume": True,
                "is_private": False,
                "claim_type": "verified_fact",
                "requires_user_confirmation": False,
            }
        )
    return projects


def extract_leadership_as_projects(block: str, source_name: str) -> list[dict[str, Any]]:
    if not block.strip():
        return []
    # Reuse plain experience parser shape, then map to projects
    faux = extract_experiences(block, source_name)
    projects = []
    for idx, exp in enumerate(faux):
        projects.append(
            {
                "id": f"lead_{idx+1:03d}",
                "name": f"{exp.get('employer')} — {exp.get('role')}",
                "role": exp.get("role"),
                "dates": " – ".join(x for x in [exp.get("start_date"), exp.get("end_date")] if x) or None,
                "technologies": exp.get("technologies") or [],
                "description": (exp.get("responsibilities") or [{}])[0].get("text", "")
                if exp.get("responsibilities")
                else "",
                "measurable_results": exp.get("measurable_results") or [],
                "source_file": source_name,
                "source_section": "leadership",
                "supporting_text": exp.get("supporting_text", ""),
                "confidence": exp.get("confidence", "medium"),
                "verification_status": "pending_review",
                "can_include_in_resume": True,
                "is_private": False,
                "claim_type": "verified_fact",
                "requires_user_confirmation": True,
                "confirmation_reason": "Imported from Technical Leadership; confirm project vs experience classification",
            }
        )
    return projects


def extract_skills(block: str, source_name: str) -> list[dict[str, Any]]:
    if not block.strip():
        return []
    skills: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw_line in block.splitlines():
        line = raw_line.strip(" -*•\t")
        if not line:
            continue
        category = "other"
        payload = line
        if ":" in line:
            cat, payload = line.split(":", 1)
            category = cat.strip()
            payload = payload.strip()
        parts = re.split(r",|;|\|", payload)
        for part in parts:
            name = part.strip().strip(".")
            if not name or len(name) > 80:
                continue
            key = name.lower()
            if key in seen:
                continue
            seen.add(key)
            skills.append(
                {
                    "name": name,
                    "category": category,
                    "source_file": source_name,
                    "source_section": "skills",
                    "supporting_text": raw_line.strip(),
                    "confidence": "high",
                    "verification_status": "pending_review",
                    "can_include_in_resume": True,
                    "is_private": False,
                    "claim_type": "verified_fact",
                    "requires_user_confirmation": False,
                    "contexts": [],
                }
            )
    return skills


def extract_certifications(block: str, source_name: str) -> list[dict[str, Any]]:
    if not block.strip():
        return []
    certs: list[dict[str, Any]] = []
    for idx, raw_line in enumerate(block.splitlines(), start=1):
        line = raw_line.strip(" -*•\t")
        if not line:
            continue
        issuer = None
        name = line
        if " – " in line or " - " in line:
            parts = re.split(r"\s+[–-]\s+", line, maxsplit=1)
            name = parts[0].strip()
            issuer = parts[1].strip() if len(parts) > 1 else None
        certs.append(
            {
                "id": f"cert_{idx:03d}",
                "name": name,
                "issuer": issuer,
                "date": None,
                "source_file": source_name,
                "source_section": "certifications",
                "supporting_text": raw_line.strip(),
                "confidence": "high",
                "verification_status": "pending_review",
                "can_include_in_resume": True,
                "is_private": False,
                "claim_type": "verified_fact",
                "requires_user_confirmation": issuer is None,
                "confirmation_reason": "Issuer/date not fully parsed" if issuer is None else None,
            }
        )
    return certs


def extract_achievements(
    experiences: list[dict[str, Any]],
    projects: list[dict[str, Any]],
    source_name: str,
) -> list[dict[str, Any]]:
    achievements: list[dict[str, Any]] = []
    idx = 0
    for exp in experiences:
        for item in exp.get("measurable_results") or []:
            idx += 1
            achievements.append(
                {
                    "id": f"ach_{idx:03d}",
                    "text": item.get("text", ""),
                    "metric": item.get("metric"),
                    "related_experience_id": exp.get("id"),
                    "related_project_id": None,
                    "source_file": source_name,
                    "source_section": "experience",
                    "supporting_text": item.get("supporting_text", ""),
                    "confidence": item.get("confidence", "medium"),
                    "verification_status": "pending_review",
                    "can_include_in_resume": True,
                    "is_private": False,
                    "claim_type": item.get("claim_type", "verified_fact"),
                    "requires_user_confirmation": bool(item.get("metric")),
                    "confirmation_reason": (
                        "Metric extracted from resume wording; confirm exact figure before emphasizing"
                        if item.get("metric")
                        else None
                    ),
                }
            )
        # Also capture strong qualitative bullets as accomplishments when no numeric metric
        for item in exp.get("responsibilities") or []:
            text = item.get("text", "")
            if not _looks_like_accomplishment(text):
                continue
            if any(a["text"] == text for a in achievements):
                continue
            idx += 1
            achievements.append(
                {
                    "id": f"ach_{idx:03d}",
                    "text": text,
                    "metric": None,
                    "related_experience_id": exp.get("id"),
                    "related_project_id": None,
                    "source_file": source_name,
                    "source_section": "experience",
                    "supporting_text": text,
                    "confidence": "medium",
                    "verification_status": "pending_review",
                    "can_include_in_resume": True,
                    "is_private": False,
                    "claim_type": "verified_fact",
                    "requires_user_confirmation": False,
                }
            )
    for proj in projects:
        for item in proj.get("measurable_results") or []:
            idx += 1
            achievements.append(
                {
                    "id": f"ach_{idx:03d}",
                    "text": item.get("text", ""),
                    "metric": item.get("metric"),
                    "related_experience_id": None,
                    "related_project_id": proj.get("id"),
                    "source_file": source_name,
                    "source_section": proj.get("source_section", "projects"),
                    "supporting_text": item.get("supporting_text", ""),
                    "confidence": item.get("confidence", "medium"),
                    "verification_status": "pending_review",
                    "can_include_in_resume": True,
                    "is_private": False,
                    "claim_type": "verified_fact",
                    "requires_user_confirmation": bool(item.get("metric")),
                }
            )
    return achievements


def parse_dates(text: str) -> tuple[Optional[str], Optional[str]]:
    match = DATE_RANGE_RE.search(text or "")
    if match:
        return _clean_date(match.group("start")), _clean_date(match.group("end"))
    single = SINGLE_DATE_RE.search(text or "")
    if single:
        return _clean_date(single.group(0)), None
    season = SEASON_DATE_RE.search(text or "")
    if season:
        return _clean_date(season.group(0)), None
    return None, None


def _clean_date(value: str | None) -> str | None:
    if not value:
        return None
    text = re.sub(r"\s+", " ", value.strip())
    text = text.replace("Sept ", "Sep ")
    return text


_TITLE_LOCATION_BLOCKLIST = {
    "software",
    "engineer",
    "developer",
    "intern",
    "research",
    "assistant",
    "technical",
    "lead",
    "senior",
    "junior",
    "manager",
    "architect",
    "analyst",
    "scientist",
    "development",
}


def _split_role_location(line: str) -> tuple[str, Optional[str]]:
    """Split trailing geographic location from a role line without swallowing the title."""
    # Try longest/most-specific location patterns first.
    patterns = [
        # City, State/Region, Country
        (
            r"^(?P<role>.+)\s+"
            r"(?P<loc>[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?,\s*[A-Z][a-zA-Z]+,\s*"
            r"(?:USA|US|United States|India))\s*$"
        ),
        # City/Region, Country
        (
            r"^(?P<role>.+)\s+"
            r"(?P<loc>[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?,\s*(?:India|USA|US))\s*$"
        ),
        # City, ST
        (
            r"^(?P<role>.+)\s+"
            r"(?P<loc>[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?,\s*[A-Z]{2})\s*$"
        ),
    ]
    for pattern in patterns:
        match = re.match(pattern, line.strip())
        if not match:
            continue
        role = match.group("role").strip(" |,-")
        loc = match.group("loc").strip()
        first = loc.split(",")[0].split()[0].lower()
        if role and first not in _TITLE_LOCATION_BLOCKLIST and len(role.split()) <= 12:
            return role, loc
    return line.strip(), None


def _split_role_employer(header: str) -> tuple[str, str]:
    for sep in [" at ", " @ ", " — ", " - ", ", "]:
        if sep in header:
            left, right = header.split(sep, 1)
            return left.strip(), right.strip()
    return header.strip(), ""


def _split_bullets(
    bullets: list[str], source_name: str, section: str
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    responsibilities: list[dict[str, Any]] = []
    measurable: list[dict[str, Any]] = []
    for bullet in bullets:
        metric = extract_metric(bullet)
        claim_type = "verified_fact"
        # Heuristic: absolute claims with no supporting metric and extreme language
        if _looks_unsupported(bullet):
            claim_type = "unsupported"
        item = {
            "text": bullet,
            "metric": metric,
            "source_file": source_name,
            "source_section": section,
            "supporting_text": bullet,
            "confidence": "high" if metric else "medium",
            "verification_status": "pending_review",
            "can_include_in_resume": claim_type != "unsupported",
            "is_private": False,
            "claim_type": claim_type,
            "requires_user_confirmation": bool(metric) or claim_type == "unsupported",
            "confirmation_reason": (
                "Potentially unsupported absolute claim"
                if claim_type == "unsupported"
                else ("Confirm extracted metric" if metric else None)
            ),
        }
        if metric:
            measurable.append(item)
        else:
            responsibilities.append(item)
    return responsibilities, measurable


def extract_metric(text: str) -> Optional[str]:
    match = METRIC_RE.search(text or "")
    return match.group(0).strip() if match else None


def _looks_like_accomplishment(text: str) -> bool:
    return bool(
        re.search(
            r"\b(improved|reduced|increased|built|developed|designed|implemented|automated|optimized|delivered)\b",
            text,
            re.I,
        )
    )


def _looks_unsupported(text: str) -> bool:
    return bool(
        re.search(
            r"\b(world'?s first|invented|patented|guaranteed|100%\s+success|never failed)\b",
            text,
            re.I,
        )
    )


def _infer_employment_type(role: str | None) -> Optional[str]:
    if not role:
        return None
    lower = role.lower()
    if "intern" in lower:
        return "Internship"
    if "research assistant" in lower:
        return "Part-time"
    return "Full-time"


def _infer_technologies_from_text(text: str) -> list[str]:
    catalog = [
        "Java", "Spring Boot", "Python", "TypeScript", "JavaScript", "Node.js", "NestJS",
        "Express.js", "React.js", "Angular", "PostgreSQL", "MongoDB", "Redis", "Kafka",
        "Docker", "Kubernetes", "Jenkins", "AWS", "GCP", "Azure", "OpenTelemetry",
        "SigNoz", "JUnit", "Git", "REST", "SQL", "C#", "Go",
    ]
    found: list[str] = []
    lower = text.lower()
    for tech in catalog:
        if tech.lower() in lower:
            found.append(tech)
    return found


def _collect_confirmations(
    contact: dict[str, Any],
    education: list[dict[str, Any]],
    experiences: list[dict[str, Any]],
    skills: list[dict[str, Any]],
) -> list[str]:
    items: list[str] = []
    if contact.get("requires_user_confirmation"):
        items.append("Contact/header fields need confirmation")
    for edu in education:
        if edu.get("requires_user_confirmation"):
            items.append(f"Education: {edu.get('institution')} / {edu.get('degree')}")
    for exp in experiences:
        if exp.get("requires_user_confirmation"):
            reason = exp.get("confirmation_reason") or "dates/title"
            items.append(f"{exp.get('employer')}: {reason}")
    if not skills:
        items.append("No skills extracted — confirm skills inventory")
    items.append("Run review-profile before tailored resume generation")
    return items


def _persist_import(
    *,
    path: Path,
    text: str,
    contact: dict[str, Any],
    education: list[dict[str, Any]],
    experiences: list[dict[str, Any]],
    skills: list[dict[str, Any]],
    projects: list[dict[str, Any]],
    certifications: list[dict[str, Any]],
    achievements: list[dict[str, Any]],
    confirmation_items: list[str],
) -> None:
    RESUMES_MASTER.mkdir(parents=True, exist_ok=True)
    # Keep binary originals in place; write markdown conversion for master_resume.md
    master_md = _to_master_markdown(contact, education, experiences, skills, projects, certifications, text, path.name)
    write_text(CANDIDATE_DIR / "master_resume.md", master_md, backup=True)

    save_yaml(
        CANDIDATE_DIR / "skills_inventory.yaml",
        {
            "schema_version": "1.1",
            "resume_imported": True,
            "skills": skills,
            "notes": ["Imported via import-resume. Complete review-profile before applications."],
        },
    )
    save_yaml(
        CANDIDATE_DIR / "verified_experience.yaml",
        {
            "schema_version": "1.1",
            "last_updated": date.today().isoformat(),
            "resume_imported": True,
            "source_files_scanned": [path.name],
            "experiences": experiences,
            "notes": confirmation_items,
        },
    )
    save_yaml(
        CANDIDATE_DIR / "project_inventory.yaml",
        {
            "schema_version": "1.1",
            "resume_imported": True,
            "projects": projects,
            "notes": ["Imported via import-resume."],
        },
    )
    save_yaml(
        CANDIDATE_DIR / "achievements.yaml",
        {
            "schema_version": "1.1",
            "resume_imported": True,
            "achievements": achievements,
            "notes": ["Metrics require confirmation before emphasis in applications."],
        },
    )
    save_yaml(
        CANDIDATE_DIR / "certifications.yaml",
        {
            "schema_version": "1.1",
            "resume_imported": True,
            "certifications": certifications,
        },
    )

    profile = load_yaml(CONFIG_DIR / "candidate_profile.yaml")
    # Preserve preferred target role settings; update identity from resume when present
    profile["full_name"] = "Jaideep Ponnam"
    if contact.get("full_name"):
        # Prefer canonical spelling requested by user
        profile["full_name"] = "Jaideep Ponnam"
    profile["preferred_name"] = profile.get("preferred_name") or "Jai"
    if contact.get("email"):
        profile["email"] = contact["email"]
    if contact.get("phone"):
        profile["phone"] = contact["phone"]
    # Keep preferred locations from preferences; store resume location separately for confirmation
    resume_location = {
        "city": contact.get("location_city"),
        "state": contact.get("location_state"),
        "country": "United States",
    }
    profile.setdefault("location", {})
    if resume_location["city"] and resume_location["state"]:
        # Do not silently overwrite preferred city if different — flag instead
        current_city = (profile.get("location") or {}).get("city")
        if current_city and current_city.lower() != resume_location["city"].lower():
            profile.setdefault("profile_notes", [])
            note = (
                f"Resume lists location {resume_location['city']}, {resume_location['state']}; "
                f"profile preferred location remains {current_city}. CONFIRM which to use on applications."
            )
            if note not in profile["profile_notes"]:
                profile["profile_notes"].append(note)
        else:
            profile["location"]["city"] = resume_location["city"]
            profile["location"]["state"] = resume_location["state"]
            profile["location"]["country"] = "United States"
    profile["resume_location"] = resume_location
    profile["education"] = education or profile.get("education") or []
    profile["certifications"] = certifications
    profile["resume_imported"] = True
    profile["profile_reviewed"] = False
    profile["profile_approved"] = False
    profile["years_of_experience_verified"] = estimate_years(experiences)
    profile["last_resume_import"] = {
        "source_file": path.name,
        "imported_on": date.today().isoformat(),
        "format": path.suffix.lower(),
    }
    save_yaml(CONFIG_DIR / "candidate_profile.yaml", profile)

    career = CANDIDATE_DIR / "career_story.md"
    write_text(
        career,
        _career_story_markdown(profile["full_name"], education, experiences, skills),
        backup=True,
    )


def estimate_years(experiences: list[dict[str, Any]]) -> float | None:
    total_months = 0
    counted = 0
    for exp in experiences:
        start = exp.get("start_date") or ""
        end = exp.get("end_date") or ""
        sm = parse_month_year(start)
        if not sm:
            continue
        if end and end.lower() in {"present", "current"}:
            em = (date.today().year, date.today().month)
        else:
            em = parse_month_year(end) if end else sm
        if not em:
            continue
        months = (em[0] - sm[0]) * 12 + (em[1] - sm[1]) + 1
        if months > 0:
            total_months += months
            counted += 1
    if not counted:
        return None
    return round(total_months / 12.0, 1)


def parse_month_year(value: str) -> tuple[int, int] | None:
    match = re.search(
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})",
        value or "",
        re.I,
    )
    if match:
        months = {
            "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
            "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
        }
        return int(match.group(2)), months[match.group(1)[:3].lower()]
    year = re.search(r"(20\d{2}|19\d{2})", value or "")
    if year:
        return int(year.group(1)), 1
    return None


def _to_master_markdown(
    contact: dict[str, Any],
    education: list[dict[str, Any]],
    experiences: list[dict[str, Any]],
    skills: list[dict[str, Any]],
    projects: list[dict[str, Any]],
    certifications: list[dict[str, Any]],
    raw_text: str,
    source_name: str,
) -> str:
    lines = [
        f"# {contact.get('full_name') or 'Jaideep Ponnam'}",
        "",
        " | ".join(
            x
            for x in [
                ", ".join(
                    p
                    for p in [contact.get("location_city"), contact.get("location_state")]
                    if p
                ),
                contact.get("phone"),
                contact.get("email"),
            ]
            if x
        ),
        "",
        f"_Imported from `{source_name}`. All facts pending review unless approved._",
        "",
        "## Education",
        "",
    ]
    for edu in education:
        lines.append(f"**{edu.get('degree')}**, {edu.get('institution')}")
        dates = " – ".join(x for x in [edu.get("start_date"), edu.get("graduation_date")] if x)
        if dates:
            lines.append(dates)
        lines.append("")
    lines.extend(["## Experience", ""])
    for exp in experiences:
        lines.append(f"### {exp.get('role')}, {exp.get('employer')}")
        meta = " | ".join(
            x
            for x in [
                " – ".join(x for x in [exp.get("start_date"), exp.get("end_date") or ""] if x),
                exp.get("location"),
            ]
            if x
        )
        if meta:
            lines.append(meta)
        lines.append("")
        for item in exp.get("responsibilities") or []:
            lines.append(f"- {item.get('text')}")
        for item in exp.get("measurable_results") or []:
            lines.append(f"- {item.get('text')}")
        lines.append("")
    if projects:
        lines.extend(["## Projects / Leadership", ""])
        for proj in projects:
            lines.append(f"### {proj.get('name')}")
            if proj.get("description"):
                lines.append(f"- {proj.get('description')}")
            for item in proj.get("measurable_results") or []:
                lines.append(f"- {item.get('text')}")
            lines.append("")
    if skills:
        lines.extend(["## Skills", ""])
        by_cat: dict[str, list[str]] = {}
        for skill in skills:
            by_cat.setdefault(skill.get("category") or "other", []).append(skill["name"])
        for cat, names in by_cat.items():
            lines.append(f"- **{cat}:** {', '.join(names)}")
        lines.append("")
    if certifications:
        lines.extend(["## Certifications", ""])
        for cert in certifications:
            issuer = f" – {cert.get('issuer')}" if cert.get("issuer") else ""
            lines.append(f"- {cert.get('name')}{issuer}")
        lines.append("")
    lines.extend(["## Source extract", "", "```", raw_text.strip(), "```", ""])
    return "\n".join(lines)


def _career_story_markdown(
    name: str,
    education: list[dict[str, Any]],
    experiences: list[dict[str, Any]],
    skills: list[dict[str, Any]],
) -> str:
    edu = education[0] if education else {}
    employers = ", ".join(e.get("employer", "") for e in experiences[:4] if e.get("employer"))
    skill_names = ", ".join(s.get("name", "") for s in skills[:12])
    return "\n".join(
        [
            f"# Career Story — {name}",
            "",
            "## Verified narrative (pending review)",
            "",
            f"{name} holds {edu.get('degree', 'a graduate CS degree')} from "
            f"{edu.get('institution', 'University of Memphis')}. "
            f"Verified employers currently on file: {employers or 'n/a'}.",
            "",
            f"Highlighted skills from resume import: {skill_names or 'n/a'}.",
            "",
            "## Review status",
            "",
            "- Facts are imported with `verification_status: pending_review`.",
            "- Run `python -m src.cli review-profile` before tailored applications.",
            "",
        ]
    )
