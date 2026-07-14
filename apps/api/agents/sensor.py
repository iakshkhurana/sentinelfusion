"""Sensor agent — process readings → elevated / abnormal facts."""

from __future__ import annotations

CO_ELEVATED = 50.0
PRESSURE_ABNORMAL = 18.0
H2S_ELEVATED = 5.0


def evaluate(sensors: dict[str, dict]) -> dict:
    gas_zones = sorted(
        {
            s["zone_id"]
            for s in sensors.values()
            if s.get("metric") == "co_ppm" and float(s["value"]) >= CO_ELEVATED
        }
    )
    pressure_zones = sorted(
        {
            s["zone_id"]
            for s in sensors.values()
            if s.get("metric") == "pressure_kpa" and float(s["value"]) >= PRESSURE_ABNORMAL
        }
    )
    toxic_zones = sorted(
        {
            s["zone_id"]
            for s in sensors.values()
            if s.get("metric") == "h2s_ppm" and float(s["value"]) >= H2S_ELEVATED
        }
    )
    facts = []
    if gas_zones:
        facts.append({"code": "gas_elevated", "label": "CO elevated above compound threshold"})
    if pressure_zones or toxic_zones:
        facts.append({"code": "abnormal_atmosphere", "label": "Pressure/toxin abnormal nearby"})
    return {
        "agent": "sensor",
        "facts": facts,
        "gas_zones": gas_zones,
        "pressure_zones": pressure_zones,
        "toxic_zones": toxic_zones,
    }
