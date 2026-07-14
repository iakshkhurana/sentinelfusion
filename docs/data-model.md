# Data model — SentinelFusion

Canonical types and field names. API handlers, FE types, and DB columns must match `snake_case` fields below (FE may map to camelCase at the boundary only).

## Plant topology

### Zone

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | e.g. `zone_coke_oven` |
| `name` | string | Display name |
| `hazard_class` | `low` \| `medium` \| `high` \| `critical` | Static classification |
| `polygon` | number[][] | SVG/plant coords `[[x,y], ...]` |
| `adjacent_zone_ids` | string[] | Undirected adjacency |

### Asset

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | e.g. `asset_co_battery_3` |
| `zone_id` | string | FK → Zone |
| `name` | string | |
| `asset_type` | string | e.g. `coke_oven`, `gas_header` |

## Telemetry & ops

### SensorReading

| Field | Type | Notes |
|-------|------|--------|
| `ts` | datetime ISO-8601 | |
| `tag_id` | string | e.g. `tag_gas_co_01` |
| `zone_id` | string | |
| `metric` | string | e.g. `co_ppm`, `pressure_kpa` |
| `value` | number | |
| `unit` | string | |

### Permit

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | e.g. `ptw_0042` |
| `permit_type` | `hot_work` \| `confined_space` \| `electrical` \| `general` \| `excavation` | |
| `status` | `requested` \| `active` \| `blocked` \| `closed` \| `expired` | |
| `zone_id` | string | Primary work zone |
| `adjacent_zone_ids` | string[] | Optional explicit touch list |
| `asset_id` | string \| null | |
| `requested_at` | datetime | |
| `starts_at` | datetime | |
| `ends_at` | datetime \| null | |
| `requester` | string | |

### MaintenanceWorkOrder

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | |
| `asset_id` | string | |
| `zone_id` | string | |
| `status` | `planned` \| `in_progress` \| `done` | |
| `starts_at` | datetime | |
| `ends_at` | datetime \| null | |
| `title` | string | |

### ShiftWindow

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | |
| `name` | string | e.g. `night_to_day` |
| `handover_start` | datetime | |
| `handover_end` | datetime | |
| `elevated_risk` | boolean | Simulator/ops flag |

## Context, assessment & decisions

### DerivedFact

| Field | Type | Notes |
|-------|------|--------|
| `code` | string | e.g. `gas_elevated`, `hot_work_adjacent` |
| `zone_id` | string \| null | |
| `value` | boolean \| number \| string | |
| `confidence` | number | 0–1 |
| `t_sec` | number | Scenario clock |
| `evidence` | object | tag_ids, permit_ids, … |

### FeatureSnapshot

| Field | Type | Notes |
|-------|------|--------|
| `ts` | datetime | |
| `scenario_id` | string \| null | |
| `zone_id` | string | |
| `features` | object | Flat numeric/bool map for ML |
| `baseline_alarm` | boolean | Single-sensor fired? |

### RiskFactor

| Field | Type | Notes |
|-------|------|--------|
| `code` | string | e.g. `gas_elevated`, `hot_work_adjacent` |
| `label` | string | Human text |
| `weight` | number | Contribution |
| `evidence` | object | Pointers: tag_ids, permit_ids, etc. |

### Assessment

Formerly thought of as `RiskEvent`. This is the assessment-pipeline output.

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | UUID |
| `ts` | datetime | When assessment committed |
| `run_id` | string | |
| `scenario_id` | string \| null | |
| `zone_id` | string | Primary |
| `score` | number | 0–1 |
| `severity` | `info` \| `watch` \| `high` \| `critical` | |
| `title` | string | |
| `summary` | string \| null | Optional AI narrative |
| `factors` | RiskFactor[] | |
| `derived_fact_codes` | string[] | Facts that fired |
| `baseline_miss` | boolean | Baseline had not fired at `ts` |
| `lead_time_sec` | number \| null | Vs incident `t*` or vs baseline fire |
| `rule_forced` | boolean | Guardrail forced CRITICAL |
| `recommended_action` | `alert` \| `block_permit` \| `escalate` \| `evacuate` | |
| `related_permit_ids` | string[] | |
| `citation_ids` | string[] | Filled after RAG attach |

### Decision

State-machine record bound to an assessment.

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | |
| `assessment_id` | string | |
| `action` | same as `recommended_action` | |
| `state` | `assessing` \| `recommended` \| `awaiting_decision` \| `confirmed` \| `dismissed` \| `executing` \| `done` \| `archived` | |
| `confirmed` | boolean | Required true for evacuate |
| `actor` | `system` \| `user` | |
| `ts` | datetime | Last transition |
| `notes` | string \| null | |

`Intervention` is an alias concept — prefer `Decision` going forward.

### Citation

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | |
| `source` | string | Doc name |
| `section` | string \| null | |
| `excerpt` | string | |
| `uri` | string \| null | |
| `score` | number | Retrieval score |

### EvidencePack

| Field | Type | Notes |
|-------|------|--------|
| `assessment_id` | string | |
| `timeline` | object[] | Ordered sensor/permit/assessment points |
| `factors` | RiskFactor[] | |
| `facts` | DerivedFact[] | |
| `citations` | Citation[] | |
| `decision` | Decision \| null | |
| `metrics` | object | lead_time_sec, baseline_miss, etc. |

## Scenarios

### Scenario

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | |
| `title` | string | |
| `description` | string | |
| `duration_sec` | number | |
| `incident_at_sec` | number | Ground-truth `t*` |
| `plant_id` | string | Layout pack id |
| `source` | string | Path to YAML file |

YAML in `packages/scenarios/*.yaml` is the authoring source; replay hydrates the tables above.

## Enums quick ref

```text
permit_type: hot_work | confined_space | electrical | general | excavation
permit_status: requested | active | blocked | closed | expired
severity: info | watch | high | critical
recommended_action: alert | block_permit | escalate | evacuate
decision_state: assessing | recommended | awaiting_decision | confirmed | dismissed | executing | done | archived
ai_provider: mock | openai | ollama
```

Update this file before inventing new fields.
