"""Shared feature schema for the compound-risk model."""

from __future__ import annotations

FEATURE_NAMES = [
    "co_max",
    "co_elevated",
    "pressure_max",
    "pressure_abnormal",
    "h2s_max",
    "hot_work_active",
    "hot_work_adjacent_gas",
    "confined_active",
    "confined_abnormal",
    "maint_active",
    "maint_gas_path",
    "active_permit_count",
]

CO_ELEVATED = 50.0
PRESSURE_ABNORMAL = 18.0
H2S_ELEVATED = 5.0


def extract_features(
    sensors: dict[str, dict],
    permits: dict[str, dict],
    maintenance: dict[str, dict],
) -> dict[str, float]:
    co_vals = [float(s["value"]) for s in sensors.values() if s.get("metric") == "co_ppm"]
    p_vals = [float(s["value"]) for s in sensors.values() if s.get("metric") == "pressure_kpa"]
    h_vals = [float(s["value"]) for s in sensors.values() if s.get("metric") == "h2s_ppm"]
    co_max = max(co_vals) if co_vals else 0.0
    pressure_max = max(p_vals) if p_vals else 0.0
    h2s_max = max(h_vals) if h_vals else 0.0

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

    hot_work_active = 0.0
    hot_work_adjacent_gas = 0.0
    confined_active = 0.0
    confined_abnormal = 0.0
    active_permits = 0

    for p in permits.values():
        if p.get("status") not in {"requested", "active"}:
            continue
        active_permits += 1
        touch = {p["zone_id"], *(p.get("adjacent_zone_ids") or [])}
        if p.get("permit_type") == "hot_work":
            hot_work_active = 1.0
            if gas_zones & touch:
                hot_work_adjacent_gas = 1.0
        if p.get("permit_type") == "confined_space":
            confined_active = 1.0
            if pressure_zones & touch or toxic_zones & touch or p["zone_id"] in toxic_zones:
                confined_abnormal = 1.0

    maint_active = 0.0
    maint_gas_path = 0.0
    for m in maintenance.values():
        if m.get("status") != "in_progress":
            continue
        maint_active = 1.0
        path_zones = {m["zone_id"], "zone_pipe_rack", "zone_gas_holder"}
        for p in permits.values():
            if p.get("status") in {"requested", "active"}:
                path_zones.update({p["zone_id"], *(p.get("adjacent_zone_ids") or [])})
        if gas_zones & path_zones:
            maint_gas_path = 1.0

    return {
        "co_max": co_max,
        "co_elevated": 1.0 if co_max >= CO_ELEVATED else 0.0,
        "pressure_max": pressure_max,
        "pressure_abnormal": 1.0 if pressure_max >= PRESSURE_ABNORMAL else 0.0,
        "h2s_max": h2s_max,
        "hot_work_active": hot_work_active,
        "hot_work_adjacent_gas": hot_work_adjacent_gas,
        "confined_active": confined_active,
        "confined_abnormal": confined_abnormal,
        "maint_active": maint_active,
        "maint_gas_path": maint_gas_path,
        "active_permit_count": float(active_permits),
    }


def vectorize(features: dict[str, float]) -> list[float]:
    return [float(features[name]) for name in FEATURE_NAMES]
