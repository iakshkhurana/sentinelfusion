# API — SentinelFusion

Base URL: `/api/v1`  
Canonical field names: `docs/data-model.md`  
Error shape: `docs/conventions.md`

## Health

### `GET /health`

```json
{ "status": "ok", "version": "0.1.0" }
```

## Plant

### `GET /plant/layout`

Returns zones (with `polygon`, `adjacent_zone_ids`) and assets.

### `GET /plant/zones/{zone_id}`

Single zone + current summary (latest scores if streaming mid-scenario).

## Scenarios

### `GET /scenarios`

List scenario summaries: `id`, `title`, `duration_sec`, `incident_at_sec`.

### `GET /scenarios/{scenario_id}`

Full scenario metadata (not the full tick dump).

### `POST /scenarios/{scenario_id}/run`

Start / reset a run.

```json
{
  "speed": 1.0,
  "start_at_sec": 0
}
```

Response: `{ "run_id": "...", "scenario_id": "...", "status": "running" }`

### `POST /runs/{run_id}/control`

```json
{ "command": "pause" | "resume" | "scrub", "at_sec": 120 }
```

`at_sec` required for `scrub`.

### `GET /runs/{run_id}`

Run status: `running` \| `paused` \| `completed`, `t_sec`, counters.

### `WS /ws/runs/{run_id}` (WebSocket)

Live nervous system. Client connects after `POST .../run`. JSON envelopes:

```json
{ "type": "twin.tick", "ts": "...", "payload": { } }
```

| `type` | `payload` |
|--------|-----------|
| `twin.tick` | `{ "t_sec", "readings", "permits", "maintenance", "zones_tint" }` |
| `facts.derived` | `{ "facts": DerivedFact[] }` |
| `baseline.fire` | `{ "zone_id", "tag_id", "t_sec" }` |
| `assessment.upsert` | `Assessment` |
| `decision.transition` | `Decision` |
| `metrics.snapshot` | lead time / FN vs baseline |
| `ai.error` | `{ "code", "message", "retries": 1 }` visible failure |
| `run.done` | summary |

REST owns commands; WS is broadcast-only from server (clients may send `{ "type": "ping" }` only).

## Assessments & decisions

### `GET /assessments`

Query: `run_id?, zone_id?, severity?, limit?`

### `GET /assessments/{id}`

Includes `factors`, `citation_ids`; `?include=citations,decision`.

### `POST /assessments/{id}/decisions`

Advance / act on the decision state machine.

```json
{
  "action": "block_permit",
  "transition": "confirm",
  "confirm": false,
  "notes": "optional"
}
```

| Rule | Behavior |
|------|----------|
| `transition` | `confirm` \| `dismiss` \| `execute` (as allowed by SM) |
| `evacuate` | requires `confirm: true` else `400` `confirmation_required` |
| `block_permit` + Demo Mode | may auto-confirm when policy says so |

### `GET /assessments/{id}/evidence-pack`

Returns `EvidencePack`.

## Baseline vs fusion metrics

### `GET /runs/{run_id}/metrics`

```json
{
  "run_id": "...",
  "scenario_id": "...",
  "incident_at_sec": 480,
  "baseline_first_fire_sec": null,
  "fusion_first_critical_sec": 312,
  "lead_time_sec": 168,
  "baseline_miss": true,
  "false_negative_baseline": true,
  "false_negative_fusion": false
}
```

## RAG

### `POST /rag/query`

```json
{
  "question": "What controls apply for hot work near gas?",
  "risk_event_id": "optional-uuid",
  "top_k": 3
}
```

Response:

```json
{
  "answer": "short guidance",
  "citations": [/* Citation */]
}
```

### `POST /assessments/{id}/attach-citations`

Server retrieves and stores citations; returns updated `Assessment`.

## ML (internal / demo)

### `GET /ml/model`

`{ "name", "version", "trained_at", "feature_names": [] }`

### `POST /ml/score` (debug)

```json
{ "features": { "gas_zscore": 2.1, "hot_work_adjacent": 1, "...": 0 } }
```

Returns `{ "score", "severity", "factor_hints": [] }` — production path is via assessment pipeline on ticks.

## Auth

v1: no auth (local/demo). If added later, Bearer token; document in a new ADR.

## OpenAPI

FastAPI serves `/docs` (Swagger) and `/redoc`. Keep handlers aligned with this file; this file wins on naming disputes until updated.
