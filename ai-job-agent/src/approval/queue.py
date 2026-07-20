"""Persistent approval queue for Level-2 actions."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from src.common.io import load_json, save_json
from src.common.paths import APPROVAL_QUEUE_JSON
from src.models.approval import ApprovalAction, ApprovalStatus, SafetyLevel

logger = logging.getLogger("ai_job_agent.approval")

# Actions that must never be auto-executed
NEVER_AUTOMATIC_TYPES = {
    "submit_application",
    "send_email",
    "send_linkedin_message",
    "accept_offer",
    "sign_agreement",
    "complete_demographic_disclosure",
    "bypass_captcha",
    "make_purchase",
    "share_sensitive_personal_information",
}


class ApprovalQueue:
    def __init__(self, path: Path | None = None) -> None:
        self.path = path or APPROVAL_QUEUE_JSON

    def _load(self) -> list[ApprovalAction]:
        data = load_json(self.path)
        items = data.get("actions", []) if isinstance(data, dict) else data
        return [ApprovalAction.model_validate(item) for item in items or []]

    def _save(self, actions: list[ApprovalAction]) -> None:
        save_json(
            self.path,
            {"actions": [a.model_dump(mode="json") for a in actions]},
            backup=True,
        )

    def enqueue(
        self,
        action_type: str,
        description: str,
        *,
        job_id: str | None = None,
        payload: dict[str, Any] | None = None,
        safety_level: SafetyLevel | None = None,
    ) -> ApprovalAction:
        if action_type in NEVER_AUTOMATIC_TYPES:
            level = SafetyLevel.NEVER_AUTOMATIC
        else:
            level = safety_level or SafetyLevel.APPROVAL_REQUIRED

        action = ApprovalAction(
            action_id=f"act_{uuid.uuid4().hex[:10]}",
            action_type=action_type,
            safety_level=level,
            description=description,
            job_id=job_id,
            payload=payload or {},
        )
        actions = self._load()
        actions.append(action)
        self._save(actions)
        logger.info("Enqueued %s (%s) id=%s", action_type, level.value, action.action_id)
        return action

    def list_pending(self) -> list[ApprovalAction]:
        return [a for a in self._load() if a.status == ApprovalStatus.PENDING]

    def get(self, action_id: str) -> Optional[ApprovalAction]:
        for action in self._load():
            if action.action_id == action_id:
                return action
        return None

    def decide(self, action_id: str, *, approve: bool, note: str = "") -> ApprovalAction:
        actions = self._load()
        for idx, action in enumerate(actions):
            if action.action_id != action_id:
                continue
            if action.safety_level == SafetyLevel.NEVER_AUTOMATIC and approve:
                raise PermissionError(
                    f"Action type '{action.action_type}' is Level 3 (never automatic) "
                    "and cannot be auto-executed by the agent. Approve only means you "
                    "will perform it manually."
                )
            action.status = ApprovalStatus.APPROVED if approve else ApprovalStatus.REJECTED
            action.decided_at = datetime.now(timezone.utc)
            action.decision_note = note
            actions[idx] = action
            self._save(actions)
            return action
        raise KeyError(f"Unknown action_id: {action_id}")
