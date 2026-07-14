"""Ops agent — maintenance / SIMOPS work on gas path."""

from __future__ import annotations


def evaluate(
    maintenance: dict[str, dict],
    sensor_report: dict,
    permits: dict[str, dict] | None = None,
) -> dict:
    permits = permits or {}
    open_jobs = [m for m in maintenance.values() if m.get("status") == "in_progress"]
    gas = set(sensor_report.get("gas_zones") or [])
    facts = []
    on_path = None
    for m in open_jobs:
        path_zones = {m["zone_id"], "zone_pipe_rack", "zone_gas_holder"}
        for p in permits.values():
            if p.get("status") in {"requested", "active"}:
                path_zones.update({p["zone_id"], *(p.get("adjacent_zone_ids") or [])})
        if gas & path_zones:
            on_path = m
            facts.append(
                {"code": "maint_on_gas_path", "label": "Maintenance on gas-handling asset"}
            )
            break
    active = [
        p
        for p in permits.values()
        if p.get("status") in {"requested", "active"}
    ]
    types = {p.get("permit_type") for p in active}
    if "hot_work" in types and "confined_space" in types:
        facts.append(
            {
                "code": "simops_conflict",
                "label": "Concurrent hot-work and confined-space permits",
            }
        )

    return {
        "agent": "ops",
        "facts": facts,
        "open_job_ids": [m["id"] for m in open_jobs],
        "job_on_gas_path": on_path,
    }
