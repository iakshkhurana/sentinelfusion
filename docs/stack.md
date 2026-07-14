# Stack — SentinelFusion

Wedge: **compound risk + permit intelligence + measurable lead time** — engineered so the demo feels alive.

## At a glance

| Layer | What we run | Why it feels good |
|-------|-------------|-------------------|
| **Backend** | FastAPI + PostgreSQL (+ pgvector) | Serious industrial backend energy |
| **Brain** | Context engine → derived facts → assessment pipeline → decision state machine | Not a pile of ifs; a story you can watch |
| **Frontend** | React bootstraps on **Digital Twin · Demo Mode** | Opens on the plant, not a login void |
| **Panels** | Assessment panel + Decision flow | Viewer sees *why* then *what to do* |
| **Simulator** | **YAML** scenario files replay fake plant events | Gas leak, permit conflict, compound risk — editable, cinematic |
| **AI** | Mock provider in dev · OpenAI-compatible / Ollama in demo | Structured output, **one retry**, then **fail visibly** |
| **Realtime** | **WebSocket** broadcast bus | Twin + UI pulse together |
| **ML + RAG** | Compound scorer + cites | Baseline vs fusion proof + regulation receipts |
| **Ops** | Docker Compose | One command, full show |

## Backend spine (cool mental model)

```text
YAML Scenario Replay
        │  plant events (gas, PTW, maint, shift)
        ▼
  Context Engine          ← windowed plant truth
        │
        ▼
  Derived Facts           ← gas_elevated, hot_work_adjacent, …
        │
        ▼
  Assessment Pipeline     ← rules + ML + explanations
        │
        ▼
  Decision State Machine  ← recommended → confirm → execute
        │
        ├──► WebSocket fanout (twin + panels live)
        └──► RAG attach (citations on critical assessments)
```

### Decision state machine

```text
idle → assessing → recommended → awaiting_decision
                                      ├─ confirmed → executing → done
                                      └─ dismissed → archived
```

High blast-radius (`evacuate`) cannot skip `awaiting_decision`.  
Demo mode may auto-advance `block_permit` recommendations.

## Frontend open state

1. **Digital Twin** (SVG plant, live heat, permit chips)  
2. **Demo Mode** chrome (scenario picker, play/scrub, speed)  
3. **Assessment panel** (severity, factors, baseline miss, lead time)  
4. **Decision flow** (recommend → confirm → executed + citations)

No dashboard soup on first paint.

## Simulator (YAML)

```yaml
id: hot_work_gas_adjacent
title: Hot work beside rising CO
incident_at_sec: 480
events:
  - t: 0
    type: sensor
    tag_id: tag_gas_co_01
    zone_id: zone_coke_oven
    metric: co_ppm
    value: 12
  - t: 300
    type: permit
    permit_type: hot_work
    zone_id: zone_adjacent_bay
    status: requested
  # ...
```

Scenarios live in `packages/scenarios/*.yaml`. Human-editable = faster demo iteration.

## AI provider contract

| Mode | Env | Behavior |
|------|-----|----------|
| Dev default | `AI_PROVIDER=mock` | Deterministic structured assessments; no network |
| Demo | `openai` or `ollama` | OpenAI-compatible chat/completions |
| Output | Pydantic schema | Always structured (`AssessmentLLMResult`) |
| Resilience | 1 retry | Then surface `ai_error` on WS + UI (no silent empty) |

RAG retrieval can run without LLM; LLM is for narrative + structured decision hints. Mock stays first-class so CI never needs keys.

## Realtime

`WS /api/v1/ws/runs/{run_id}`

Broadcast envelopes:

- `twin.tick` — readings, permits, zone tint  
- `facts.derived` — updated derived fact set  
- `assessment.upsert` — compound assessment  
- `decision.transition` — state machine move  
- `metrics.snapshot` — lead time / FN vs baseline  
- `ai.error` — visible failure after retry  

REST still owns commands (run control, confirm decision). WS is the live nervous system.

## Locked choices pointer

Authoritative ADRs: `docs/decisions.md` (incl. ADR-012+).  
Contracts: `docs/api.md`, `docs/data-model.md`.
