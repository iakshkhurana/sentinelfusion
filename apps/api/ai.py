"""Pluggable AI briefs — mock by default (ADR-015)."""

from __future__ import annotations

import os


def brief(*, title: str, action: str, factors: list[dict], rule_forced: bool) -> dict:
    """Return a short structured ops brief. Fake providers fail loudly later."""
    provider = os.getenv("AI_PROVIDER", "mock")
    if provider != "mock":
        # ponytail: only mock wired; OpenAI/Ollama later
        return {
            "provider": provider,
            "ok": False,
            "error": f"provider_{provider}_not_configured",
            "summary": None,
        }

    why = "; ".join(f["label"] for f in (factors or [])[:3]) or "compound conditions"
    mode = "rule guardrail" if rule_forced else "model-elevated risk"
    summary = (
        f"{title}. {mode.capitalize()} recommends {action.replace('_', ' ')}. "
        f"Drivers: {why}."
    )
    return {"provider": "mock", "ok": True, "error": None, "summary": summary}
