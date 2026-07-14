import json
from pathlib import Path

import yaml
from fastapi import FastAPI, HTTPException

app = FastAPI(title="SentinelFusion API", version="0.1.0")

# ponytail: resolve scenarios from monorepo layout; swap for env var when packaging
_SCENARIOS = Path(__file__).resolve().parents[2] / "packages" / "scenarios"


def _load_yaml(path: Path) -> dict:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or "id" not in data:
        raise ValueError(f"invalid scenario: {path.name}")
    return data


def _scenario_summary(data: dict) -> dict:
    return {
        "id": data["id"],
        "title": data.get("title", data["id"]),
        "description": (data.get("description") or "").strip(),
        "duration_sec": data["duration_sec"],
        "incident_at_sec": data["incident_at_sec"],
        "plant_id": data["plant_id"],
    }


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}


@app.get("/api/v1/plant/layout")
def plant_layout(plant_id: str = "steel_pack_v1") -> dict:
    path = _SCENARIOS / "plant" / f"{plant_id}.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="plant_not_found")
    return json.loads(path.read_text(encoding="utf-8"))


@app.get("/api/v1/scenarios")
def list_scenarios() -> list[dict]:
    paths = sorted(_SCENARIOS.glob("*.yaml"))
    return [_scenario_summary(_load_yaml(p)) for p in paths]


@app.get("/api/v1/scenarios/{scenario_id}")
def get_scenario(scenario_id: str) -> dict:
    path = _SCENARIOS / f"{scenario_id}.yaml"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="scenario_not_found")
    data = _load_yaml(path)
    summary = _scenario_summary(data)
    summary["events"] = data.get("events", [])
    return summary
