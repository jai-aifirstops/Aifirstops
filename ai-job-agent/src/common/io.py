"""Safe YAML/JSON/text IO with optional backups."""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


def load_yaml(path: Path) -> Any:
    """Load a YAML file; return empty dict if missing."""
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    return data if data is not None else {}


def save_yaml(path: Path, data: Any, *, backup: bool = True) -> None:
    """Write YAML; optionally back up an existing file first."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if backup and path.exists():
        create_backup(path)
    with path.open("w", encoding="utf-8") as fh:
        yaml.safe_dump(data, fh, sort_keys=False, allow_unicode=True)


def load_json(path: Path) -> Any:
    """Load JSON; return empty dict if missing."""
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def save_json(path: Path, data: Any, *, backup: bool = True) -> None:
    """Write JSON with indentation; optionally back up first."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if backup and path.exists():
        create_backup(path)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False, default=str)
        fh.write("\n")


def read_text(path: Path) -> str:
    """Read UTF-8 text."""
    return path.read_text(encoding="utf-8")


def write_text(path: Path, content: str, *, backup: bool = True) -> None:
    """Write UTF-8 text; optionally back up first."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if backup and path.exists():
        create_backup(path)
    path.write_text(content, encoding="utf-8")


def create_backup(path: Path) -> Path:
    """Create a timestamped .bak sibling and return its path."""
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = path.with_suffix(path.suffix + f".{stamp}.bak")
    shutil.copy2(path, backup_path)
    return backup_path
