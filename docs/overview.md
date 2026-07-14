# Overview — SentinelFusion

**Domain:** Industrial Intelligence · Worker Safety · Geospatial Safety Analytics

Stack vibe sheet: [`docs/stack.md`](stack.md)

## One-liner

**SentinelFusion** — open a living plant Digital Twin, watch compound risk **assessments** form from derived facts, then drive a **decision flow** that blocks unsafe work — with citations and lead-time proof vs dumb single-sensor alarms.

## Unique wedge

Others ship SOP chat. We ship a watchable ops brain:

1. **YAML twin scenarios** — gas leak, permit conflict, compound risk, scrubbable  
2. **Context → derived facts → assessment → decision SM** — clear, demable pipeline  
3. **Live WebSocket twin** — map + panels pulse together  
4. **Measurable win** — lead time / FN vs single-sensor baseline + RAG receipts  

## What you see first (Frontend)

App boots on **Digital Twin · Demo Mode**:

- Plant SVG heatmap + permit chips  
- **Assessment panel** (severity, factors, baseline miss)  
- **Decision flow** (recommend → confirm → execute)  

## Ambition

| Layer | What “excellent” means |
|-------|------------------------|
| Backend | FastAPI + Postgres · context engine · facts · assessment · decision SM |
| Simulator | YAML scenarios that feel cinematic |
| AI | Mock in dev · OpenAI/Ollama in demo · structured · 1 retry · fail visibly |
| Realtime | WebSocket fanout |
| ML + RAG | Compound scorer + cites |
| Ops | Docker Compose one-command show |

## Why this exists

Heavy industry has sensors and permits. Fatal patterns are **combinations**. Vizag-pattern: data present, intelligence absent.

## Demo story (90 seconds)

1. Boot twin in Demo Mode → play YAML scenario.  
2. Gas rises; hot work requested nearby.  
3. Baseline quiet / late.  
4. Assessment CRITICAL → decision **block permit** → cites → metrics.  
5. The map turns red *before* the incident clock.

## Success metrics

Compound catch vs baseline · lead time · FN reduction · geo evidence · citation relevance  

## Deliverables

Working prototype · Architecture diagram · Presentation deck · Demo video
