"""Parse raw job dicts / text into JobPosting models."""

from __future__ import annotations

import hashlib
import logging
import re
from datetime import date, datetime, timezone
from typing import Any, Optional

from src.models.job import EmploymentType, JobPosting, WorkArrangement

logger = logging.getLogger("ai_job_agent.job_parser")

YEARS_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*\+?\s*(?:-|to)?\s*(\d+(?:\.\d+)?)?\s*\+?\s*years?",
    re.IGNORECASE,
)

AUTH_PATTERNS = [
    (r"(?i)(sponsorship|visa|h-?1b|opt|work authorization|authorized to work)[^.?\n]{0,200}", "auth"),
    (r"(?i)(u\.?s\.? citizen|citizenship|permanent resident|green card|security clearance|ts/sci|secret clearance)[^.?\n]{0,200}", "clearance"),
]


class JobParser:
    """Normalize heterogeneous job payloads into JobPosting."""

    def parse(self, raw: dict[str, Any], *, source: str = "manual") -> JobPosting:
        return parse_job_dict(raw, source=source)


def parse_job_dict(raw: dict[str, Any], *, source: str = "manual") -> JobPosting:
    """Convert a raw job dictionary into a validated JobPosting."""
    title = str(raw.get("title") or raw.get("job_title") or "").strip()
    company = str(raw.get("company") or raw.get("company_name") or "").strip()
    if not title or not company:
        raise ValueError("Job must include title and company")

    description = str(raw.get("description") or raw.get("job_description") or "")
    raw_text = str(raw.get("raw_text") or description)

    job_id = str(raw.get("job_id") or raw.get("id") or "").strip()
    if not job_id:
        job_id = _stable_id(company, title, str(raw.get("application_url") or raw.get("url") or ""))

    location = str(raw.get("location") or "")
    arrangement = _parse_arrangement(raw.get("work_arrangement"), location, description)
    employment = _parse_employment(raw.get("employment_type"), description)

    exp_min, exp_max = _parse_experience_years(raw, description)
    auth_lang, sponsorship_lang, clearance_lang = _extract_auth_language(
        description + "\n" + raw_text,
        raw,
    )

    tech = _as_str_list(raw.get("technology_stack") or raw.get("technologies"))
    if not tech:
        tech = _infer_technologies(description)

    posting = JobPosting(
        job_id=job_id,
        title=title,
        company=company,
        location=location,
        work_arrangement=arrangement,
        employment_type=employment,
        salary_range=raw.get("salary_range") or raw.get("salary"),
        posting_date=_parse_date(raw.get("posting_date") or raw.get("date_posted")),
        original_url=str(raw.get("original_url") or raw.get("url") or ""),
        application_url=str(raw.get("application_url") or raw.get("apply_url") or raw.get("url") or ""),
        description=description,
        required_qualifications=_as_str_list(raw.get("required_qualifications") or raw.get("requirements")),
        preferred_qualifications=_as_str_list(raw.get("preferred_qualifications") or raw.get("nice_to_have")),
        responsibilities=_as_str_list(raw.get("responsibilities")),
        technology_stack=tech,
        experience_years_min=exp_min,
        experience_years_max=exp_max,
        education_requirement=raw.get("education_requirement"),
        work_authorization_language=auth_lang,
        sponsorship_language=sponsorship_lang,
        citizenship_or_clearance_language=clearance_lang,
        source=str(raw.get("source") or source),
        date_discovered=_parse_datetime(raw.get("date_discovered")) or datetime.now(timezone.utc),
        application_deadline=_parse_date(raw.get("application_deadline")),
        is_expired=bool(raw.get("is_expired", False)),
        is_staffing_repost=bool(raw.get("is_staffing_repost", False)),
        company_verified=bool(raw.get("company_verified", True)),
        raw_text=raw_text,
    )
    logger.debug("Parsed job %s at %s", posting.job_id, posting.company)
    return posting


def _stable_id(company: str, title: str, url: str) -> str:
    basis = f"{company.lower().strip()}|{title.lower().strip()}|{url.strip()}"
    return "job_" + hashlib.sha256(basis.encode("utf-8")).hexdigest()[:12]


def _as_str_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        parts = re.split(r"[\n;•]|,(?=\s*[A-Z])", value)
        return [p.strip(" -\t") for p in parts if p and p.strip(" -\t")]
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [str(value)]


def _parse_arrangement(value: Any, location: str, description: str) -> WorkArrangement:
    text = f"{value or ''} {location} {description}".lower()
    if "remote" in text and "hybrid" in text:
        return WorkArrangement.HYBRID
    if re.search(r"\bremote\b", text):
        return WorkArrangement.REMOTE
    if "hybrid" in text:
        return WorkArrangement.HYBRID
    if "onsite" in text or "on-site" in text or "in office" in text:
        return WorkArrangement.ONSITE
    if value:
        try:
            return WorkArrangement(str(value).lower())
        except ValueError:
            pass
    return WorkArrangement.UNKNOWN


def _parse_employment(value: Any, description: str) -> EmploymentType:
    text = f"{value or ''} {description}".lower()
    if "full-time" in text or "full time" in text:
        return EmploymentType.FULL_TIME
    if "part-time" in text or "part time" in text:
        return EmploymentType.PART_TIME
    if "contract" in text:
        return EmploymentType.CONTRACT
    if "intern" in text:
        return EmploymentType.INTERNSHIP
    if value:
        for et in EmploymentType:
            if et.value.lower() == str(value).lower():
                return et
    return EmploymentType.UNKNOWN


def _parse_experience_years(
    raw: dict[str, Any], description: str
) -> tuple[Optional[float], Optional[float]]:
    if raw.get("experience_years_min") is not None or raw.get("experience_years_max") is not None:
        amin = raw.get("experience_years_min")
        amax = raw.get("experience_years_max")
        return (
            float(amin) if amin is not None else None,
            float(amax) if amax is not None else None,
        )
    match = YEARS_PATTERN.search(description)
    if not match:
        return None, None
    low = float(match.group(1))
    high = float(match.group(2)) if match.group(2) else None
    return low, high


def _extract_auth_language(
    text: str, raw: dict[str, Any]
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    auth = raw.get("work_authorization_language")
    sponsorship = raw.get("sponsorship_language")
    clearance = raw.get("citizenship_or_clearance_language")

    if not auth or not sponsorship or not clearance:
        for pattern, kind in AUTH_PATTERNS:
            found = re.search(pattern, text)
            if not found:
                continue
            snippet = found.group(0).strip()
            lower = snippet.lower()
            if kind == "clearance" and not clearance:
                clearance = snippet
            elif kind == "auth":
                if "sponsor" in lower or "visa" in lower or "h-1b" in lower or "h1b" in lower:
                    sponsorship = sponsorship or snippet
                else:
                    auth = auth or snippet
    return auth, sponsorship, clearance


def _infer_technologies(description: str) -> list[str]:
    catalog = [
        "Python", "Java", "JavaScript", "TypeScript", "Go", "Rust",
        "FastAPI", "Flask", "Django", "PyTorch", "TensorFlow", "LangChain",
        "LlamaIndex", "OpenAI", "Hugging Face", "AWS", "GCP", "Azure",
        "Docker", "Kubernetes", "PostgreSQL", "MongoDB", "Redis",
        "Spark", "Airflow", "Kafka", "RAG", "LLM", "MLOps",
    ]
    found: list[str] = []
    lower = description.lower()
    for tech in catalog:
        if tech.lower() in lower:
            found.append(tech)
    return found


def _parse_date(value: Any) -> Optional[date]:
    if value is None or value == "":
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    text = str(value)[:10]
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _parse_datetime(value: Any) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
