"""CSV-backed application tracker."""

from __future__ import annotations

import csv
import logging
from datetime import date
from pathlib import Path
from typing import Any, Optional

from src.common.paths import TRACKER_CSV
from src.models.job import JobPosting
from src.models.matching import MatchReport

logger = logging.getLogger("ai_job_agent.tracking")

TRACKER_COLUMNS = [
    "job_id",
    "date_discovered",
    "date_prepared",
    "date_applied",
    "company",
    "job_title",
    "location",
    "work_arrangement",
    "employment_type",
    "salary_range",
    "posting_url",
    "application_url",
    "source",
    "match_score",
    "priority",
    "resume_version",
    "cover_letter_created",
    "referral_status",
    "contact_name",
    "contact_url",
    "application_status",
    "last_follow_up_date",
    "next_follow_up_date",
    "interview_stage",
    "work_authorization_notes",
    "notes",
]

ALLOWED_STATUSES = {
    "Discovered",
    "Analyzing",
    "Skip",
    "Preparing",
    "Awaiting Approval",
    "Ready to Apply",
    "Applied",
    "Recruiter Screen",
    "Technical Interview",
    "Hiring Manager Interview",
    "Final Interview",
    "Offer",
    "Rejected",
    "Withdrawn",
    "Closed",
}


class ApplicationTracker:
    """Idempotent application tracker stored as CSV."""

    def __init__(self, path: Path | None = None) -> None:
        self.path = path or TRACKER_CSV
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write_rows([])

    def list_rows(self) -> list[dict[str, str]]:
        with self.path.open("r", encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            return list(reader)

    def get(self, job_id: str) -> Optional[dict[str, str]]:
        for row in self.list_rows():
            if row.get("job_id") == job_id:
                return row
        return None

    def upsert(self, row: dict[str, Any]) -> dict[str, str]:
        job_id = str(row.get("job_id") or "").strip()
        if not job_id:
            raise ValueError("job_id is required")
        rows = self.list_rows()
        normalized = {col: str(row.get(col, "") or "") for col in TRACKER_COLUMNS}
        if normalized.get("application_status") and normalized["application_status"] not in ALLOWED_STATUSES:
            raise ValueError(f"Invalid status: {normalized['application_status']}")
        replaced = False
        for idx, existing in enumerate(rows):
            if existing.get("job_id") == job_id:
                merged = dict(existing)
                for key, value in normalized.items():
                    if value != "" or key not in merged:
                        merged[key] = value
                rows[idx] = {col: merged.get(col, "") for col in TRACKER_COLUMNS}
                normalized = rows[idx]
                replaced = True
                break
        if not replaced:
            rows.append(normalized)
        self._write_rows(rows)
        logger.info("Tracker upsert job_id=%s status=%s", job_id, normalized.get("application_status"))
        return normalized

    def add_from_match(self, job: JobPosting, report: MatchReport) -> dict[str, str]:
        status = "Skip" if report.rejected or report.match_score < 50 else "Discovered"
        if report.match_score >= 65 and not report.rejected:
            status = "Analyzing"
        auth_notes = "; ".join(
            x
            for x in [
                job.work_authorization_language or "",
                job.sponsorship_language or "",
                job.citizenship_or_clearance_language or "",
            ]
            if x
        )
        return self.upsert(
            {
                "job_id": job.job_id,
                "date_discovered": (job.date_discovered.date().isoformat() if job.date_discovered else date.today().isoformat()),
                "company": job.company,
                "job_title": job.title,
                "location": job.location,
                "work_arrangement": job.work_arrangement.value,
                "employment_type": job.employment_type.value,
                "salary_range": job.salary_range or "",
                "posting_url": job.original_url,
                "application_url": job.application_url,
                "source": job.source,
                "match_score": f"{report.match_score:.1f}",
                "priority": report.application_priority,
                "application_status": status,
                "work_authorization_notes": auth_notes,
                "notes": report.executive_recommendation,
            }
        )

    def update_status(self, job_id: str, status: str, **fields: Any) -> dict[str, str]:
        if status not in ALLOWED_STATUSES:
            raise ValueError(f"Invalid status: {status}")
        if status == "Applied":
            # Safety: only allow when explicitly confirmed via mark-applied CLI
            if not fields.get("user_confirmed_submission"):
                raise PermissionError(
                    "Refusing to mark Applied without explicit user confirmation "
                    "(use mark-applied after you submit)."
                )
        existing = self.get(job_id) or {"job_id": job_id}
        existing["application_status"] = status
        for key, value in fields.items():
            if key == "user_confirmed_submission":
                continue
            if key in TRACKER_COLUMNS:
                existing[key] = value
        return self.upsert(existing)

    def follow_ups_due(self, on_date: date | None = None) -> list[dict[str, str]]:
        target = (on_date or date.today()).isoformat()
        return [
            row
            for row in self.list_rows()
            if row.get("next_follow_up_date") and row["next_follow_up_date"] <= target
            and row.get("application_status") not in {"Rejected", "Withdrawn", "Closed", "Skip"}
        ]

    def _write_rows(self, rows: list[dict[str, str]]) -> None:
        with self.path.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=TRACKER_COLUMNS)
            writer.writeheader()
            for row in rows:
                writer.writerow({col: row.get(col, "") for col in TRACKER_COLUMNS})
