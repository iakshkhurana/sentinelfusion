import json
from pathlib import Path

from fastapi import FastAPI, HTTPException

app = FastAPI(title="SentinelFusion API", version="0.1.0")

# ponytail: resolve scenarios from monorepo layout; swap for env var when packaging
_SCENARIOS = Path(__file__).resolve().parents[2] / "packages" / "scenarios"


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}


@app.get("/api/v1/plant/layout")
def plant_layout(plant_id: str = "steel_pack_v1") -> dict:
    path = _SCENARIOS / "plant" / f"{plant_id}.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="plant_not_found")
    return json.loads(path.read_text(encoding="utf-8"))
