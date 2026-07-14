import asyncio
import json
from pathlib import Path

import yaml
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel


from cites import search_knowledge
from decisions import decide
from engine import iter_replay, replay
from scorer import model_ready

app = FastAPI(title="SentinelFusion API", version="0.1.0")

# ponytail: resolve scenarios from monorepo layout; swap for env var when packaging
_SCENARIOS = Path(__file__).resolve().parents[2] / "packages" / "scenarios"
_TICK_PAUSE_SEC = 0.45

# last assessments from sync/WS runs — enough for demo decisions
_assessments: dict[str, dict] = {}
_decisions: list[dict] = []


class DecideBody(BaseModel):
    confirm: bool = False
    notes: str | None = None


class KnowledgeQuery(BaseModel):
    question: str
    top_k: int = 3


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


def _scenario_or_404(scenario_id: str) -> dict:
    path = _SCENARIOS / f"{scenario_id}.yaml"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="scenario_not_found")
    return _load_yaml(path)


def _remember(assessments: list[dict]) -> None:
    for a in assessments:
        if a.get("id"):
            _assessments[a["id"]] = a


@app.get("/api/v1/health")
def health() -> dict:
    return {"status": "ok", "version": "0.1.0", "model_ready": model_ready()}


@app.get("/api/v1/ml/model")
def ml_model() -> dict:
    from pathlib import Path
    import json

    metrics_path = Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "metrics.json"
    metrics = json.loads(metrics_path.read_text(encoding="utf-8")) if metrics_path.is_file() else {}
    return {"ready": model_ready(), "metrics": metrics}


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
    data = _scenario_or_404(scenario_id)
    summary = _scenario_summary(data)
    summary["events"] = data.get("events", [])
    return summary


@app.post("/api/v1/scenarios/{scenario_id}/run")
def run_scenario(scenario_id: str) -> dict:
    data = _scenario_or_404(scenario_id)
    result = replay(data)
    _remember(result["assessments"])
    return {
        "scenario_id": scenario_id,
        "status": "completed",
        "assessments": result["assessments"],
        "metrics": result["metrics"],
    }


@app.post("/api/v1/assessments/{assessment_id}/decide")
def decide_assessment(assessment_id: str, body: DecideBody = DecideBody()) -> dict:
    assessment = _assessments.get(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="assessment_not_found")
    try:
        decision = decide(assessment, confirm=body.confirm, notes=body.notes)
    except ValueError as exc:
        code = str(exc)
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": code, "message": code}},
        ) from exc
    _decisions.append(decision)
    return decision


@app.get("/api/v1/decisions")
def list_decisions() -> list[dict]:
    return list(reversed(_decisions))


@app.post("/api/v1/knowledge/query")
def knowledge_query(body: KnowledgeQuery) -> dict:
    return search_knowledge(body.question, top_k=body.top_k)


@app.websocket("/api/v1/ws/scenarios/{scenario_id}")
async def ws_scenario(scenario_id: str, websocket: WebSocket) -> None:
    path = _SCENARIOS / f"{scenario_id}.yaml"
    if not path.is_file():
        await websocket.close(code=4404)
        return
    await websocket.accept()
    data = _load_yaml(path)
    state: dict = {"paused": False, "scrub_to": None}

    async def listen_control() -> None:
        try:
            while True:
                raw = await websocket.receive_json()
                if raw.get("type") != "control":
                    continue
                cmd = raw.get("command")
                if cmd == "pause":
                    state["paused"] = True
                    await websocket.send_json(
                        {"type": "run.control", "payload": {"status": "paused"}}
                    )
                elif cmd == "resume":
                    state["paused"] = False
                    await websocket.send_json(
                        {"type": "run.control", "payload": {"status": "running"}}
                    )
                elif cmd == "scrub":
                    at = raw.get("at_sec")
                    if at is None:
                        continue
                    state["scrub_to"] = float(at)
                    state["paused"] = False
                    await websocket.send_json(
                        {
                            "type": "run.control",
                            "payload": {"status": "running", "scrub_to": state["scrub_to"]},
                        }
                    )
        except WebSocketDisconnect:
            return

    listener = asyncio.create_task(listen_control())
    try:
        for msg in iter_replay(data):
            while state["paused"]:
                await asyncio.sleep(0.05)
            if msg["type"] == "assessment.upsert":
                _remember([msg["payload"]])
            elif msg["type"] == "run.done":
                _remember(msg["payload"].get("assessments") or [])

            t = msg.get("payload", {}).get("t_sec") if isinstance(msg.get("payload"), dict) else None
            scrub_to = state["scrub_to"]
            skipping = scrub_to is not None and t is not None and float(t) < scrub_to
            if skipping and msg["type"] == "twin.tick":
                continue

            if scrub_to is not None and t is not None and float(t) >= scrub_to:
                state["scrub_to"] = None

            await websocket.send_json(msg)
            if msg["type"] != "run.done" and not skipping:
                await asyncio.sleep(_TICK_PAUSE_SEC)
    except WebSocketDisconnect:
        return
    finally:
        listener.cancel()
        try:
            await listener
        except asyncio.CancelledError:
            pass
