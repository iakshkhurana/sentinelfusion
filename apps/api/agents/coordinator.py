"""Fusion coordinator — combine agent facts with rules + ML (rules cannot downgrade)."""

from __future__ import annotations

import uuid

from agents import ops, permit, sensor
from cites import citations_for
from features_bridge import extract_features, vectorize
from scorer import score_features

ML_CRITICAL = 0.88


def _rule_from_agents(
    feats: dict[str, float],
    sensor_r: dict,
    permit_r: dict,
    ops_r: dict,
) -> dict | None:
    gas_zones = sensor_r["gas_zones"]
    if feats["hot_work_adjacent_gas"] >= 1 and permit_r.get("hot_work"):
        p = permit_r["hot_work"]
        return {
            "title": "Hot work adjacent to elevated gas",
            "zone_id": p["zone_id"],
            "recommended_action": "block_permit",
            "related_permit_ids": [p["id"]],
            "factors": [
                {"code": "gas_elevated", "label": "CO elevated above compound threshold"},
                {"code": "hot_work_adjacent", "label": "Hot-work permit touches gas zone"},
            ],
            "gas_zone_ids": gas_zones,
            "rule_score": 0.96,
        }
    if feats["confined_abnormal"] >= 1 and permit_r.get("confined"):
        p = permit_r["confined"]
        return {
            "title": "Confined space under abnormal atmosphere",
            "zone_id": p["zone_id"],
            "recommended_action": "escalate",
            "related_permit_ids": [p["id"]],
            "factors": [
                {"code": "confined_space_entry", "label": "Active confined-space entry"},
                {"code": "abnormal_atmosphere", "label": "Pressure/toxin abnormal nearby"},
            ],
            "gas_zone_ids": sorted(
                set(sensor_r["pressure_zones"]) | set(sensor_r["toxic_zones"])
            ),
            "rule_score": 0.94,
        }
    if feats["maint_gas_path"] >= 1 and ops_r.get("job_on_gas_path"):
        m = ops_r["job_on_gas_path"]
        return {
            "title": "Maintenance on gas path with rising detectors",
            "zone_id": m["zone_id"],
            "recommended_action": "block_permit",
            "related_permit_ids": list(permit_r.get("active_ids") or []),
            "factors": [
                {"code": "maint_on_gas_path", "label": "Maintenance on gas-handling asset"},
                {"code": "gas_elevated", "label": "CO elevated on supply path"},
            ],
            "gas_zone_ids": gas_zones,
            "rule_score": 0.91,
        }
    return None


def fuse(
    *,
    t: float,
    sensors: dict[str, dict],
    permits: dict[str, dict],
    maintenance: dict[str, dict],
    baseline_first: float | None,
) -> dict | None:
    sensor_r = sensor.evaluate(sensors)
    permit_r = permit.evaluate(permits, sensor_r)
    ops_r = ops.evaluate(maintenance, sensor_r, permits)
    agents = [sensor_r, permit_r, ops_r]

    feats = extract_features(sensors, permits, maintenance)
    ml = score_features(vectorize(feats))
    model_score = ml["model_score"]
    rule = _rule_from_agents(feats, sensor_r, permit_r, ops_r)
    miss = baseline_first is None or baseline_first > t

    if rule is None and (model_score is None or model_score < ML_CRITICAL):
        return None

    if rule is not None:
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
        related = list(permit_r.get("active_ids") or [])
        gas_zone_ids = list(sensor_r["gas_zones"])

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
        "agents": [
            {"agent": a["agent"], "facts": a["facts"]}
            for a in agents
        ],
    }
