"""Replay plant events and score compound risk vs a single-sensor baseline."""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from typing import Any

# ponytail: hardcoded thresholds for demo physics; replace with config/model later
CO_ELEVATED = 50.0
CO_ALARM = 100.0
PRESSURE_ABNORMAL = 18.0
PRESSURE_ALARM = 23.0
H2S_ELEVATED = 5.0


def _zones_tint(sensors: dict[str, dict]) -> dict[str, float]:
    tint: dict[str, float] = {}
    for s in sensors.values():
        metric = s.get("metric")
        value = float(s["value"])
        if metric == "co_ppm":
            level = min(1.0, value / 120.0)
        elif metric == "pressure_kpa":
            level = min(1.0, max(0.0, (value - 12.0) / 14.0))
        elif metric == "h2s_ppm":
            level = min(1.0, value / 15.0)
        else:
            continue
        zid = s["zone_id"]
        tint[zid] = max(tint.get(zid, 0.0), level)
    return tint


def _metrics(
    incident_at: float,
    baseline_first: float | None,
    fusion_first: float | None,
) -> dict[str, Any]:
    lead = None if fusion_first is None else max(0.0, incident_at - fusion_first)
    return {
        "incident_at_sec": incident_at,
        "baseline_first_fire_sec": baseline_first,
        "fusion_first_critical_sec": fusion_first,
        "lead_time_sec": lead,
        "baseline_miss": baseline_first is None
        or (fusion_first is not None and baseline_first > fusion_first),
        "false_negative_baseline": baseline_first is None or baseline_first >= incident_at,
        "false_negative_fusion": fusion_first is None or fusion_first >= incident_at,
    }


def _check_baseline(sensors: dict[str, dict], t: float) -> dict | None:
    for s in sensors.values():
        if s.get("metric") == "co_ppm" and float(s["value"]) >= CO_ALARM:
            return {"t_sec": t, "zone_id": s["zone_id"], "tag_id": s["tag_id"]}
        if s.get("metric") == "pressure_kpa" and float(s["value"]) >= PRESSURE_ALARM:
            return {"t_sec": t, "zone_id": s["zone_id"], "tag_id": s["tag_id"]}
    return None


def _assess_compound(
    *,
    t: float,
    sensors: dict[str, dict],
    permits: dict[str, dict],
    maintenance: dict[str, dict],
    baseline_first: float | None,
) -> dict | None:
    gas_zones = {
        s["zone_id"]
        for s in sensors.values()
        if s.get("metric") == "co_ppm" and float(s["value"]) >= CO_ELEVATED
    }
    pressure_zones = {
        s["zone_id"]
        for s in sensors.values()
        if s.get("metric") == "pressure_kpa" and float(s["value"]) >= PRESSURE_ABNORMAL
    }
    toxic_zones = {
        s["zone_id"]
        for s in sensors.values()
        if s.get("metric") == "h2s_ppm" and float(s["value"]) >= H2S_ELEVATED
    }
    miss = baseline_first is None or baseline_first > t

    for p in permits.values():
        if p.get("status") not in {"requested", "active"}:
            continue
        touch = {p["zone_id"], *(p.get("adjacent_zone_ids") or [])}
        if p.get("permit_type") == "hot_work" and gas_zones & touch:
            return {
                "id": str(uuid.uuid4()),
                "t_sec": t,
                "severity": "critical",
                "title": "Hot work adjacent to elevated gas",
                "score": 0.96,
                "zone_id": p["zone_id"],
                "rule_forced": True,
                "recommended_action": "block_permit",
                "related_permit_ids": [p["id"]],
                "factors": [
                    {"code": "gas_elevated", "label": "CO elevated above compound threshold"},
                    {"code": "hot_work_adjacent", "label": "Hot-work permit touches gas zone"},
                ],
                "baseline_miss": miss,
                "gas_zone_ids": sorted(gas_zones),
            }
        if p.get("permit_type") == "confined_space" and (
            pressure_zones & touch or toxic_zones & touch or p["zone_id"] in toxic_zones
        ):
            return {
                "id": str(uuid.uuid4()),
                "t_sec": t,
                "severity": "critical",
                "title": "Confined space under abnormal atmosphere",
                "score": 0.94,
                "zone_id": p["zone_id"],
                "rule_forced": True,
                "recommended_action": "escalate",
                "related_permit_ids": [p["id"]],
                "factors": [
                    {"code": "confined_space_entry", "label": "Active confined-space entry"},
                    {"code": "abnormal_atmosphere", "label": "Pressure/toxin abnormal nearby"},
                ],
                "baseline_miss": miss,
                "gas_zone_ids": sorted(pressure_zones | toxic_zones),
            }

    active_maint = [m for m in maintenance.values() if m.get("status") == "in_progress"]
    if active_maint and gas_zones:
        m = active_maint[0]
        path_zones = {m["zone_id"], "zone_pipe_rack", "zone_gas_holder"}
        for p in permits.values():
            if p.get("status") in {"requested", "active"}:
                path_zones.update({p["zone_id"], *(p.get("adjacent_zone_ids") or [])})
        if gas_zones & path_zones:
            return {
                "id": str(uuid.uuid4()),
                "t_sec": t,
                "severity": "critical",
                "title": "Maintenance on gas path with rising detectors",
                "score": 0.91,
                "zone_id": m["zone_id"],
                "rule_forced": True,
                "recommended_action": "block_permit",
                "related_permit_ids": [
                    p["id"]
                    for p in permits.values()
                    if p.get("status") in {"requested", "active"}
                ],
                "factors": [
                    {"code": "maint_on_gas_path", "label": "Maintenance on gas-handling asset"},
                    {"code": "gas_elevated", "label": "CO elevated on supply path"},
                ],
                "baseline_miss": miss,
                "gas_zone_ids": sorted(gas_zones),
            }
    return None


def iter_replay(scenario: dict) -> Iterator[dict[str, Any]]:
    """Yield live envelopes for WebSocket; same logic as sync replay."""
    sensors: dict[str, dict] = {}
    permits: dict[str, dict] = {}
    maintenance: dict[str, dict] = {}
    assessments: list[dict] = []
    baseline_first: float | None = None
    fusion_first: float | None = None
    seen_critical = False

    incident_at = float(scenario["incident_at_sec"])
    events = sorted(scenario.get("events", []), key=lambda e: float(e["t"]))

    for ev in events:
        t = float(ev["t"])
        etype = ev.get("type")

        if etype == "sensor":
            sensors[ev["tag_id"]] = ev
        elif etype == "permit":
            permits[ev["id"]] = ev
        elif etype == "maintenance":
            maintenance[ev["id"]] = ev
        elif etype == "incident":
            yield {
                "type": "twin.tick",
                "payload": {
                    "t_sec": t,
                    "zones_tint": _zones_tint(sensors),
                    "readings": list(sensors.values()),
                    "permits": list(permits.values()),
                    "incident": ev,
                },
            }
            continue

        baseline_fire = None
        if baseline_first is None:
            baseline_fire = _check_baseline(sensors, t)
            if baseline_fire:
                baseline_first = t

        assessment = None
        if not seen_critical:
            assessment = _assess_compound(
                t=t,
                sensors=sensors,
                permits=permits,
                maintenance=maintenance,
                baseline_first=baseline_first,
            )
            if assessment:
                seen_critical = True
                fusion_first = t
                assessments.append(assessment)

        yield {
            "type": "twin.tick",
            "payload": {
                "t_sec": t,
                "zones_tint": _zones_tint(sensors),
                "readings": list(sensors.values()),
                "permits": list(permits.values()),
            },
        }
        if baseline_fire:
            yield {"type": "baseline.fire", "payload": baseline_fire}
        if assessment:
            yield {"type": "assessment.upsert", "payload": assessment}

    metrics = _metrics(incident_at, baseline_first, fusion_first)
    yield {
        "type": "run.done",
        "payload": {
            "scenario_id": scenario["id"],
            "assessments": assessments,
            "metrics": metrics,
        },
    }


def replay(scenario: dict) -> dict:
    assessments: list[dict] = []
    metrics: dict[str, Any] | None = None
    for msg in iter_replay(scenario):
        if msg["type"] == "run.done":
            metrics = msg["payload"]["metrics"]
            assessments = msg["payload"]["assessments"]
    return {"scenario_id": scenario["id"], "assessments": assessments, "metrics": metrics}


def _self_check() -> None:
    hot = {
        "id": "self",
        "incident_at_sec": 480,
        "events": [
            {"t": 300, "type": "sensor", "tag_id": "g", "zone_id": "zone_coke_oven", "metric": "co_ppm", "value": 74},
            {
                "t": 300,
                "type": "permit",
                "id": "p1",
                "permit_type": "hot_work",
                "status": "active",
                "zone_id": "zone_maintenance_bay",
                "adjacent_zone_ids": ["zone_coke_oven"],
            },
            {"t": 420, "type": "sensor", "tag_id": "g", "zone_id": "zone_coke_oven", "metric": "co_ppm", "value": 118},
        ],
    }
    out = replay(hot)
    assert out["metrics"]["fusion_first_critical_sec"] == 300
    assert out["metrics"]["baseline_first_fire_sec"] == 420

    confined = {
        "id": "cs",
        "incident_at_sec": 420,
        "events": [
            {
                "t": 180,
                "type": "permit",
                "id": "c1",
                "permit_type": "confined_space",
                "status": "active",
                "zone_id": "zone_byproduct",
                "adjacent_zone_ids": ["zone_gas_holder"],
            },
            {
                "t": 240,
                "type": "sensor",
                "tag_id": "p",
                "zone_id": "zone_gas_holder",
                "metric": "pressure_kpa",
                "value": 19.5,
            },
        ],
    }
    assert replay(confined)["metrics"]["fusion_first_critical_sec"] == 240


if __name__ == "__main__":
    _self_check()
    print("engine ok")
