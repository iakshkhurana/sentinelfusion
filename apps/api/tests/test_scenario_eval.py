"""P0 scenario eval harness — fusion must beat baseline before incident."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

from engine import replay
from main import app

_SCENARIOS = Path(__file__).resolve().parents[3] / "packages" / "scenarios"
_PATHS = sorted(_SCENARIOS.glob("*.yaml"))


@pytest.mark.parametrize("path", _PATHS, ids=lambda p: p.stem)
def test_fusion_beats_baseline_before_incident(path: Path) -> None:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    out = replay(data)
    m = out["metrics"]
    fusion = m["fusion_first_critical_sec"]
    baseline = m["baseline_first_fire_sec"]
    incident = data["incident_at_sec"]

    assert fusion is not None, f"{path.stem}: fusion never went critical"
    assert fusion < incident, f"{path.stem}: fusion @{fusion}s not before incident @{incident}s"
    assert baseline is None or fusion < baseline, (
        f"{path.stem}: fusion @{fusion}s not earlier than baseline @{baseline}s"
    )
    assert out["assessments"], f"{path.stem}: no assessments emitted"
    crit = next(a for a in out["assessments"] if a.get("severity") == "critical")
    assert crit.get("citations"), f"{path.stem}: missing citations"
    assert all(c.get("next_step") for c in crit["citations"]), f"{path.stem}: citation missing next_step"
    assert {a["agent"] for a in crit.get("agents") or []} == {"sensor", "permit", "ops"}
    assert crit.get("ai", {}).get("ok") is True
    assert crit["ai"].get("summary")


def test_knowledge_corpus_loaded() -> None:
    from cites import _corpus, citations_for

    corpus = _corpus()
    assert "hot_work_adjacent" in corpus
    cite = citations_for(["hot_work_adjacent"])[0]
    assert cite["next_step"]
    assert cite["source"]


def test_health_and_model_ready() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["model_ready"] is True


def test_sync_run_returns_metrics() -> None:
    client = TestClient(app)
    res = client.post("/api/v1/scenarios/hot_work_gas_adjacent/run")
    assert res.status_code == 200
    body = res.json()
    assert body["metrics"]["fusion_first_critical_sec"] == 300
    assert body["metrics"]["lead_time_sec"] == 180
