"""Replay plant events and score compound risk vs a single-sensor baseline."""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from typing import Any

from cites import citations_for
from features_bridge import extract_features, vectorize
from scorer import score_features

# ponytail: hardcoded thresholds for demo physics; replace with config/model later
CO_ELEVATED = 50.0
CO_ALARM = 100.0
PRESSURE_ABNORMAL = 18.0
PRESSURE_ALARM = 23.0
H2S_ELEVATED = 5.0
# ML can surface high risk even when a brittle rule misses — rules still cannot be downgraded
ML_CRITICAL = 0.88


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


def _rule_hit(
    sensors: dict[str, dict],
    permits: dict[str, dict],
    maintenance: dict[str, dict],
    feats: dict[str, float],
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

    if feats["hot_work_adjacent_gas"] >= 1:
        p = next(
            p
            for p in permits.values()
            if p.get("permit_type") == "hot_work" and p.get("status") in {"requested", "active"}
        )
        return {
            "title": "Hot work adjacent to elevated gas",
            "zone_id": p["zone_id"],
            "recommended_action": "block_permit",
            "related_permit_ids": [p["id"]],
            "factors": [
                {"code": "gas_elevated", "label": "CO elevated above compound threshold"},
                {"code": "hot_work_adjacent", "label": "Hot-work permit touches gas zone"},
            ],
            "gas_zone_ids": sorted(gas_zones),
            "rule_score": 0.96,
        }

    if feats["confined_abnormal"] >= 1:
        p = next(
            p
            for p in permits.values()
            if p.get("permit_type") == "confined_space" and p.get("status") in {"requested", "active"}
        )
        return {
            "title": "Confined space under abnormal atmosphere",
            "zone_id": p["zone_id"],
            "recommended_action": "escalate",
            "related_permit_ids": [p["id"]],
            "factors": [
                {"code": "confined_space_entry", "label": "Active confined-space entry"},
                {"code": "abnormal_atmosphere", "label": "Pressure/toxin abnormal nearby"},
            ],
            "gas_zone_ids": sorted(pressure_zones | toxic_zones),
            "rule_score": 0.94,
        }

    if feats["maint_gas_path"] >= 1:
        m = next(m for m in maintenance.values() if m.get("status") == "in_progress")
        return {
            "title": "Maintenance on gas path with rising detectors",
            "zone_id": m["zone_id"],
            "recommended_action": "block_permit",
            "related_permit_ids": [
                p["id"] for p in permits.values() if p.get("status") in {"requested", "active"}
            ],
            "factors": [
                {"code": "maint_on_gas_path", "label": "Maintenance on gas-handling asset"},
                {"code": "gas_elevated", "label": "CO elevated on supply path"},
            ],
            "gas_zone_ids": sorted(gas_zones),
            "rule_score": 0.91,
        }
    return None


def _assess_compound(
    *,
    t: float,
    sensors: dict[str, dict],
    permits: dict[str, dict],
    maintenance: dict[str, dict],
    baseline_first: float | None,
) -> dict | None:
    feats = extract_features(sensors, permits, maintenance)
    ml = score_features(vectorize(feats))
    model_score = ml["model_score"]
    rule = _rule_hit(sensors, permits, maintenance, feats)
    miss = baseline_first is None or baseline_first > t

    if rule is None and (model_score is None or model_score < ML_CRITICAL):
        return None

    if rule is not None:
        # Rules win on lethal combos — ML may raise score, never lower severity
        score = max(rule["rule_score"], model_score or 0.0)
        rule_forced = True
        title = rule["title"]
        zone_id = rule["zone_id"]
        action = rule["recommended_action"]
        factors = rule["factors"]
        related = rule["related_permit_ids"]
        gas_zone_ids = rule["gas_zone_ids"]
    else:
        rule_forced = False
        score = float(model_score)
        title = "Model-detected compound risk"
        zone_id = next(iter(sensors.values()), {}).get("zone_id", "zone_control_room")
        action = "escalate"
        factors = [{"code": f, "label": f.replace("_", " ")} for f in ml["top_features"][:3]]
        related = [p["id"] for p in permits.values() if p.get("status") in {"requested", "active"}]
        gas_zone_ids = sorted(
            {
                s["zone_id"]
                for s in sensors.values()
                if s.get("metric") == "co_ppm" and float(s["value"]) >= CO_ELEVATED
            }
        )

    factor_codes = [f["code"] for f in factors]
    return {
        "id": str(uuid.uuid4()),
        "t_sec": t,
        "severity": "critical",
        "title": title,
        "score": score,
        "model_score": model_score,
        "model_available": ml["model_available"],
        "model_top_features": ml["top_features"],
        "zone_id": zone_id,
        "rule_forced": rule_forced,
        "recommended_action": action,
        "related_permit_ids": related,
        "factors": factors,
        "citations": citations_for(factor_codes),
        "baseline_miss": miss,
        "gas_zone_ids": gas_zone_ids,
        "features": feats,
    }


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
    assert out["assessments"][0]["rule_forced"] is True
    assert out["assessments"][0]["citations"]


if __name__ == "__main__":
    _self_check()
    print("engine ok")
