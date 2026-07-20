"""Deduplicate job postings by identity and description similarity."""

from __future__ import annotations

import hashlib
import logging
import re
from collections import defaultdict
from difflib import SequenceMatcher
from typing import Iterable

from src.models.job import JobPosting

logger = logging.getLogger("ai_job_agent.dedupe")

SOURCE_PRIORITY = {
    "company_career_page": 0,
    "greenhouse": 1,
    "lever": 2,
    "ashby": 3,
    "manual": 4,
    "fixture": 5,
    "adzuna": 6,
    "serpapi": 7,
}


class Deduplicator:
    """Remove duplicate postings, preferring official/direct sources."""

    def __init__(
        self,
        *,
        title_similarity_threshold: float = 0.92,
        description_similarity_threshold: float = 0.88,
        source_priority: dict[str, int] | None = None,
    ) -> None:
        self.title_similarity_threshold = title_similarity_threshold
        self.description_similarity_threshold = description_similarity_threshold
        self.source_priority = source_priority or SOURCE_PRIORITY

    def dedupe(self, jobs: Iterable[JobPosting]) -> tuple[list[JobPosting], list[JobPosting]]:
        """Return (kept, removed_duplicates)."""
        jobs_list = list(jobs)
        kept: list[JobPosting] = []
        removed: list[JobPosting] = []

        by_key: dict[str, list[JobPosting]] = defaultdict(list)
        for job in jobs_list:
            by_key[self._hard_key(job)].append(job)

        candidates: list[JobPosting] = []
        for group in by_key.values():
            winner = self._prefer(group)
            candidates.append(winner)
            for other in group:
                if other.job_id != winner.job_id:
                    removed.append(other)

        for job in sorted(candidates, key=lambda j: (j.company.lower(), j.title.lower())):
            duplicate_of = None
            for existing in kept:
                if self._is_soft_duplicate(job, existing):
                    duplicate_of = existing
                    break
            if duplicate_of is None:
                kept.append(job)
            else:
                preferred = self._prefer([job, duplicate_of])
                if preferred.job_id == job.job_id:
                    kept = [j for j in kept if j.job_id != duplicate_of.job_id]
                    kept.append(job)
                    removed.append(duplicate_of)
                else:
                    removed.append(job)

        logger.info("Deduped %s -> %s kept, %s removed", len(jobs_list), len(kept), len(removed))
        return kept, removed

    def _hard_key(self, job: JobPosting) -> str:
        company = _normalize_company(job.company)
        title = _normalize_title(job.title)
        loc = _normalize_text(job.location)
        url = _canonicalize_url(job.application_url or job.original_url)
        if job.job_id and not job.job_id.startswith("job_"):
            return f"id:{job.job_id}|{company}"
        if url:
            return f"url:{url}"
        return f"ctl:{company}|{title}|{loc}"

    def _is_soft_duplicate(self, a: JobPosting, b: JobPosting) -> bool:
        if _normalize_company(a.company) != _normalize_company(b.company):
            return False
        title_sim = SequenceMatcher(None, _normalize_title(a.title), _normalize_title(b.title)).ratio()
        if title_sim < self.title_similarity_threshold:
            return False
        desc_a = _normalize_text(a.description or a.raw_text)[:4000]
        desc_b = _normalize_text(b.description or b.raw_text)[:4000]
        if not desc_a or not desc_b:
            return title_sim >= 0.97 and _normalize_text(a.location) == _normalize_text(b.location)
        desc_sim = SequenceMatcher(None, desc_a, desc_b).ratio()
        return desc_sim >= self.description_similarity_threshold

    def _prefer(self, jobs: list[JobPosting]) -> JobPosting:
        return sorted(
            jobs,
            key=lambda j: (
                self.source_priority.get(j.source, 99),
                0 if j.application_url else 1,
                0 if j.company_verified else 1,
                -(len(j.description or "")),
            ),
        )[0]


def dedupe_jobs(jobs: Iterable[JobPosting]) -> tuple[list[JobPosting], list[JobPosting]]:
    return Deduplicator().dedupe(jobs)


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").lower()).strip()


def _normalize_company(value: str) -> str:
    text = _normalize_text(value)
    text = re.sub(r"\b(inc|llc|ltd|corp|corporation|company|co)\b\.?", "", text)
    return re.sub(r"[^a-z0-9 ]", "", text).strip()


def _normalize_title(value: str) -> str:
    text = _normalize_text(value)
    text = re.sub(r"\(.*?\)", "", text)
    return re.sub(r"[^a-z0-9 ]", "", text).strip()


def _canonicalize_url(url: str) -> str:
    if not url:
        return ""
    text = url.strip().lower().split("?")[0].split("#")[0].rstrip("/")
    text = re.sub(r"^https?://(www\.)?", "", text)
    return text
