"""Load agent configuration from YAML files."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from src.common.io import load_yaml
from src.common.paths import CONFIG_DIR


@lru_cache(maxsize=1)
def load_candidate_profile() -> dict[str, Any]:
    return load_yaml(CONFIG_DIR / "candidate_profile.yaml")


@lru_cache(maxsize=1)
def load_job_preferences() -> dict[str, Any]:
    return load_yaml(CONFIG_DIR / "job_preferences.yaml")


@lru_cache(maxsize=1)
def load_scoring_rules() -> dict[str, Any]:
    return load_yaml(CONFIG_DIR / "scoring_rules.yaml")


@lru_cache(maxsize=1)
def load_search_sources() -> dict[str, Any]:
    return load_yaml(CONFIG_DIR / "search_sources.yaml")


def reload_config() -> None:
    """Clear cached config (e.g. after profile update)."""
    load_candidate_profile.cache_clear()
    load_job_preferences.cache_clear()
    load_scoring_rules.cache_clear()
    load_search_sources.cache_clear()
