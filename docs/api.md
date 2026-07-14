# API — SentinelFusion

Base URL: `/api/v1`  
Canonical field names: `docs/data-model.md`  
Error shape: `docs/conventions.md`

What runs today is listed below. OpenAPI: `/docs`.

## Health & ML

### `GET /api/v1/health`

```json
{ "status": "ok", "version": "0.1.0", "model_ready": true }
```

### `GET /api/v1/ml/model`

```json
{ "ready": true, "metrics": { /* training smoke metrics */ } }
```

## Plant

### `GET /api/v1/plant/layout?plant_id=steel_pack_v1`

Zones (`polygon`, `adjacent_zone_ids`) + assets.

## Scenarios

### `GET /api/v1/scenarios`

Summaries: `id`, `title`, `description`, `duration_sec`, `incident_at_sec`, `plant_id`.

### `GET /api/v1/scenarios/{scenario_id}`

Summary + full `events` list.

### `POST /api/v1/scenarios/{scenario_id}/run`

Headless replay (sync). Returns assessments + metrics for harness / fallback demos.

```json
{
  "scenario_id": "hot_work_gas_adjacent",
  "status": "completed",
  "assessments": [/* Assessment */],
  "metrics": {
    "incident_at_sec": 480,
    "baseline_first_fire_sec": 420,
    "fusion_first_critical_sec": 300,
    "lead_time_sec": 180,
    "baseline_miss": true,
    "false_negative_baseline": false,
    "false_negative_fusion": false
  }
}
```

### `WS /api/v1/ws/scenarios/{scenario_id}`

Live demo path. Server streams envelopes (client receives only):

| `type` | `payload` |
|--------|-----------|
| `twin.tick` | `{ t_sec, zones_tint, readings, permits, detections? }` |
| `baseline.fire` | `{ t_sec, zone_id, tag_id }` |
| `assessment.upsert` | `Assessment` (factors, citations, agents, ai, …) |
| `run.done` | `{ scenario_id, assessments, metrics }` |

## Assessments & decisions

Assessments are retained in-memory from the last sync/WS runs (demo process).

### `POST /api/v1/assessments/{assessment_id}/decide`

```json
{ "confirm": false, "notes": "optional" }
```

| Rule | Behavior |
|------|----------|
| `evacuate` | requires `confirm: true` else `400` `confirmation_required` |
| `block_permit` | returns blocked permit ids |
| unknown action | `400` `unknown_action` |

### `GET /api/v1/decisions`

Newest-first decision audit trail for the process lifetime.

## Knowledge (thin RAG)

### `POST /api/v1/knowledge/query`

Keyword recall over `packages/knowledge/excerpts.json` (no vector DB yet).

```json
{ "question": "hot work near gas", "top_k": 3 }
```

```json
{
  "answer": "Block / suspend the hot-work PTW until gas is independently cleared.",
  "citations": [{ "code": "hot_work_adjacent", "source": "…", "excerpt": "…", "next_step": "…" }]
}
```

## Auth

v1: no auth (local/demo).
