"""Minimal decision state machine for assessment actions."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone


def decide(assessment: dict, *, confirm: bool = False, notes: str | None = None) -> dict:
    action = assessment.get("recommended_action")
    if action not in {"alert", "block_permit", "escalate", "evacuate"}:
        raise ValueError("unknown_action")
    if action == "evacuate" and not confirm:
        raise ValueError("confirmation_required")

    blocked = list(assessment.get("related_permit_ids") or []) if action == "block_permit" else []
    label = {
        "alert": "Alert acknowledged",
        "block_permit": f"Blocked permit(s): {', '.join(blocked) or 'n/a'}",
        "escalate": "Escalated to shift supervisor / HSE",
        "evacuate": "Evacuation protocol initiated",
    }[action]

    return {
        "id": str(uuid.uuid4()),
        "assessment_id": assessment["id"],
        "action": action,
        "state": "done",
        "confirmed": bool(confirm or action != "evacuate"),
        "blocked_permit_ids": blocked,
        "message": label,
        "notes": notes,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
