"""Discover jobs from configured local sources (API hooks optional)."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from src.common.config import load_search_sources
from src.common.io import load_json, save_json
from src.common.paths import JOBS_NORMALIZED, JOBS_RAW, PROJECT_ROOT
from src.job_discovery.dedupe import Deduplicator
from src.job_parser.parser import parse_job_dict
from src.models.job import JobPosting

logger = logging.getLogger("ai_job_agent.discover")


def discover_jobs(*, dry_run: bool = False) -> dict[str, Any]:
    """Load jobs from enabled local sources, parse, dedupe, and persist."""
    config = load_search_sources()
    sources = config.get("sources", [])
    raw_jobs: list[dict[str, Any]] = []
    source_counts: dict[str, int] = {}

    for source in sources:
        if not source.get("enabled", False):
            continue
        source_type = source.get("type")
        source_id = source.get("id", "unknown")
        if source_type == "local_json":
            loaded = _load_local_json_source(source)
            raw_jobs.extend(loaded)
            source_counts[source_id] = len(loaded)
            logger.info("Source %s loaded %s jobs", source_id, len(loaded))
        elif source_type in {"adzuna_api", "serpapi"}:
            logger.warning(
                "Source %s (%s) is configured but disabled/unavailable in this build. "
                "Enable credentials in .env and implement adapter to activate.",
                source_id,
                source_type,
            )
        else:
            logger.warning("Unknown source type: %s", source_type)

    parsed: list[JobPosting] = []
    parse_errors: list[str] = []
    for raw in raw_jobs:
        try:
            parsed.append(parse_job_dict(raw, source=str(raw.get("source") or "manual")))
        except Exception as exc:  # noqa: BLE001 — collect and continue
            parse_errors.append(str(exc))
            logger.exception("Failed to parse job: %s", exc)

    kept, removed = Deduplicator().dedupe(parsed)

    if not dry_run:
        for job in kept:
            out = JOBS_NORMALIZED / f"{job.job_id}.json"
            save_json(out, job.model_dump(mode="json"), backup=False)

    return {
        "raw_count": len(raw_jobs),
        "parsed_count": len(parsed),
        "kept": kept,
        "duplicates_removed": len(removed),
        "parse_errors": parse_errors,
        "source_counts": source_counts,
        "dry_run": dry_run,
    }


def _load_local_json_source(source: dict[str, Any]) -> list[dict[str, Any]]:
    rel = source.get("path", "jobs/raw")
    path = Path(rel)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    if not path.exists():
        return []

    jobs: list[dict[str, Any]] = []
    if path.is_file():
        data = load_json(path)
        jobs.extend(_coerce_job_list(data, default_source=source.get("id", "manual")))
        return jobs

    for file in sorted(path.glob("*.json")):
        data = load_json(file)
        jobs.extend(_coerce_job_list(data, default_source=source.get("id", "manual")))
    # Also accept dropping files into jobs/raw even if source path is fixtures
    if path != JOBS_RAW and JOBS_RAW.exists() and source.get("id") == "manual":
        for file in sorted(JOBS_RAW.glob("*.json")):
            data = load_json(file)
            jobs.extend(_coerce_job_list(data, default_source="manual"))
    return jobs


def _coerce_job_list(data: Any, *, default_source: str) -> list[dict[str, Any]]:
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict) and "jobs" in data:
        items = data["jobs"]
    elif isinstance(data, dict):
        items = [data]
    else:
        return []
    result: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        item = dict(item)
        item.setdefault("source", default_source)
        result.append(item)
    return result
