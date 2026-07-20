"""Discover resume files under resumes/master/."""

from __future__ import annotations

from pathlib import Path

from src.common.paths import RESUMES_MASTER
from src.common.resume_readers import SUPPORTED_RESUME_EXTENSIONS

IGNORE_NAMES = {"readme.md", ".gitkeep", ".ds_store"}


def list_resume_files(directory: Path | None = None) -> list[Path]:
    """Return supported resume files in the master resume directory."""
    root = directory or RESUMES_MASTER
    if not root.exists():
        return []
    files: list[Path] = []
    for path in sorted(root.iterdir(), key=lambda p: p.name.lower()):
        if not path.is_file():
            continue
        if path.name.startswith("."):
            continue
        if path.name.lower() in IGNORE_NAMES:
            continue
        if path.suffix.lower() not in SUPPORTED_RESUME_EXTENSIONS:
            continue
        files.append(path)
    return files


def discover_resume(*, directory: Path | None = None) -> Path:
    """
    Auto-select a resume when exactly one supported file exists.

    Raises ValueError when zero or multiple resumes are present.
    """
    files = list_resume_files(directory)
    if not files:
        raise ValueError(
            f"No resume found in {(directory or RESUMES_MASTER)}. "
            "Place a .pdf, .docx, .md, or .txt file there, then re-run "
            "`python -m src.cli import-resume --auto`."
        )
    if len(files) > 1:
        listing = "\n".join(f"  - {p.name}" for p in files)
        raise ValueError(
            f"Multiple resumes found in {(directory or RESUMES_MASTER)}:\n{listing}\n"
            "Pass an explicit path, or leave only one resume file for --auto."
        )
    return files[0]
