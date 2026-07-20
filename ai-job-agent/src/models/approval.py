"""Human-approval checkpoint models."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class SafetyLevel(str, Enum):
    AUTOMATIC = "level_1_automatic"
    APPROVAL_REQUIRED = "level_2_approval_required"
    NEVER_AUTOMATIC = "level_3_never_automatic"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ApprovalAction(BaseModel):
    action_id: str
    action_type: str
    safety_level: SafetyLevel
    status: ApprovalStatus = ApprovalStatus.PENDING
    job_id: Optional[str] = None
    description: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    decided_at: Optional[datetime] = None
    decision_note: Optional[str] = None
