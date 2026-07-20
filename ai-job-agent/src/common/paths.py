"""Project path helpers rooted at ai-job-agent/."""

from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONFIG_DIR = PROJECT_ROOT / "config"
CANDIDATE_DIR = PROJECT_ROOT / "candidate"
JOBS_RAW = PROJECT_ROOT / "jobs" / "raw"
JOBS_NORMALIZED = PROJECT_ROOT / "jobs" / "normalized"
JOBS_ANALYZED = PROJECT_ROOT / "jobs" / "analyzed"
JOBS_ARCHIVED = PROJECT_ROOT / "jobs" / "archived"
APPLICATIONS_PREPARED = PROJECT_ROOT / "applications" / "prepared"
APPLICATIONS_SUBMITTED = PROJECT_ROOT / "applications" / "submitted"
APPLICATIONS_INTERVIEWS = PROJECT_ROOT / "applications" / "interviews"
RESUMES_MASTER = PROJECT_ROOT / "resumes" / "master"
RESUMES_TAILORED = PROJECT_ROOT / "resumes" / "tailored"
REPORTS_DAILY = PROJECT_ROOT / "reports" / "daily"
REPORTS_WEEKLY = PROJECT_ROOT / "reports" / "weekly"
DATA_DIR = PROJECT_ROOT / "data"
TRACKER_CSV = DATA_DIR / "application_tracker.csv"
CONTACTS_CSV = DATA_DIR / "contacts.csv"
JOB_CACHE_JSON = DATA_DIR / "job_cache.json"
APPROVAL_QUEUE_JSON = DATA_DIR / "approval_queue.json"
