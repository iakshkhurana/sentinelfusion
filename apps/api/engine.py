"""Replay plant events and score compound risk vs a single-sensor baseline."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterator
from typing import Any

from agents import fuse

# ponytail: hardcoded thresholds for demo physics; replace with config/model later
CO_ALARM = 100.0
PRESSURE_ALARM = 23.0


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
    detections: dict[str, dict],
    baseline_first: float | None,
) -> dict | None:
    return fuse(
        t=t,
        sensors=sensors,
        permits=permits,
        maintenance=maintenance,
        detections=detections,
        baseline_first=baseline_first,
    )


def iter_replay(scenario: dict) -> Iterator[dict[str, Any]]:
    """Yield live envelopes for WebSocket; same logic as sync replay."""
    sensors: dict[str, dict] = {}
    permits: dict[str, dict] = {}
    maintenance: dict[str, dict] = {}
    detections: dict[str, dict] = {}
    assessments: list[dict] = []
    baseline_first: float | None = None
    fusion_first: float | None = None
    seen_critical = False

    incident_at = float(scenario["incident_at_sec"])
    by_t: dict[float, list[dict]] = defaultdict(list)
    for ev in scenario.get("events", []):
        by_t[float(ev["t"])].append(ev)

    for t in sorted(by_t):
        batch = by_t[t]
        incident = None
        for ev in batch:
            etype = ev.get("type")
            if etype == "sensor":
                sensors[ev["tag_id"]] = ev
            elif etype == "permit":
                permits[ev["id"]] = ev
            elif etype == "maintenance":
                maintenance[ev["id"]] = ev
            elif etype == "cv":
                detections[ev.get("camera_id") or ev.get("id") or f"cv_{t}"] = ev
            elif etype == "incident":
                incident = ev

        if incident is not None:
            yield {
                "type": "twin.tick",
                "payload": {
                    "t_sec": t,
                    "zones_tint": _zones_tint(sensors),
                    "readings": list(sensors.values()),
                    "permits": list(permits.values()),
                    "detections": list(detections.values()),
                    "incident": incident,
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
                detections=detections,
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
                "detections": list(detections.values()),
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
    assert out["assessments"][0]["rule_forced"] is True
    assert out["assessments"][0]["citations"]
    assert out["assessments"][0]["agents"]


if __name__ == "__main__":
    _self_check()
    print("engine ok")
