"""Structured logging setup."""

from __future__ import annotations

import logging
import os
import sys


def setup_logging(level: str | None = None) -> logging.Logger:
    """Configure root logger and return the agent logger."""
    resolved = (level or os.getenv("LOG_LEVEL", "INFO")).upper()
    logging.basicConfig(
        level=resolved,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout,
        force=True,
    )
    return logging.getLogger("ai_job_agent")
