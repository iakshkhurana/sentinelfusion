"""Replay plant events and score compound risk vs a single-sensor baseline."""

from __future__ import annotations

# ponytail: hardcoded thresholds for demo physics; replace with config/model later
CO_ELEVATED = 50.0
CO_ALARM = 100.0


def replay(scenario: dict) -> dict:
    sensors: dict[str, dict] = {}
    permits: dict[str, dict] = {}
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
        elif etype == "incident":
            continue

        # baseline: hard single-sensor alarm only
        if baseline_first is None:
            for s in sensors.values():
                if s.get("metric") == "co_ppm" and float(s["value"]) >= CO_ALARM:
                    baseline_first = t
                    break

        gas_zones = {
            s["zone_id"]
            for s in sensors.values()
            if s.get("metric") == "co_ppm" and float(s["value"]) >= CO_ELEVATED
        }
        hot = [
            p
            for p in permits.values()
            if p.get("permit_type") == "hot_work" and p.get("status") in {"requested", "active"}
        ]

        hit = None
        for p in hot:
            touch = {p["zone_id"], *(p.get("adjacent_zone_ids") or [])}
            if gas_zones & touch:
                hit = p
                break

        if hit and not seen_critical:
            seen_critical = True
            fusion_first = t
            assessments.append(
                {
                    "t_sec": t,
                    "severity": "critical",
                    "title": "Hot work adjacent to elevated gas",
                    "score": 0.96,
                    "zone_id": hit["zone_id"],
                    "rule_forced": True,
                    "recommended_action": "block_permit",
                    "related_permit_ids": [hit["id"]],
                    "factors": [
                        {"code": "gas_elevated", "label": "CO elevated above compound threshold"},
                        {"code": "hot_work_adjacent", "label": "Hot-work permit touches gas zone"},
                    ],
                    "baseline_miss": baseline_first is None or baseline_first > t,
                }
            )

    lead = None if fusion_first is None else max(0.0, incident_at - fusion_first)
    return {
        "scenario_id": scenario["id"],
        "assessments": assessments,
        "metrics": {
            "incident_at_sec": incident_at,
            "baseline_first_fire_sec": baseline_first,
            "fusion_first_critical_sec": fusion_first,
            "lead_time_sec": lead,
            "baseline_miss": baseline_first is None
            or (fusion_first is not None and baseline_first > fusion_first),
            "false_negative_baseline": baseline_first is None or baseline_first >= incident_at,
            "false_negative_fusion": fusion_first is None or fusion_first >= incident_at,
        },
    }


def _self_check() -> None:
    scenario = {
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
    out = replay(scenario)
    assert out["metrics"]["fusion_first_critical_sec"] == 300
    assert out["metrics"]["baseline_first_fire_sec"] == 420
    assert out["metrics"]["lead_time_sec"] == 180


if __name__ == "__main__":
    _self_check()
    print("engine ok")
