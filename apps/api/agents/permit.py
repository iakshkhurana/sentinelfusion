"""Permit agent — active PTW set + adjacency flags."""

from __future__ import annotations


def evaluate(permits: dict[str, dict], sensor_report: dict) -> dict:
    active = [
        p
        for p in permits.values()
        if p.get("status") in {"requested", "active"}
    ]
    gas = set(sensor_report.get("gas_zones") or [])
    pressure = set(sensor_report.get("pressure_zones") or [])
    toxic = set(sensor_report.get("toxic_zones") or [])
    abnormal = pressure | toxic

    facts = []
    hot = next((p for p in active if p.get("permit_type") == "hot_work"), None)
    confined = next((p for p in active if p.get("permit_type") == "confined_space"), None)

    if hot:
        adj = set(hot.get("adjacent_zone_ids") or [])
        if gas & adj or hot["zone_id"] in gas:
            facts.append(
                {"code": "hot_work_adjacent", "label": "Hot-work permit touches gas zone"}
            )
    if confined:
        adj = set(confined.get("adjacent_zone_ids") or [])
        if abnormal & adj or confined["zone_id"] in abnormal:
            facts.append(
                {"code": "confined_space_entry", "label": "Active confined-space entry"}
            )

    return {
        "agent": "permit",
        "facts": facts,
        "active_ids": [p["id"] for p in active],
        "hot_work": hot,
        "confined": confined,
    }
