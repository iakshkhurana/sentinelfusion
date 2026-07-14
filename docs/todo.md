# Todo — SentinelFusion (excellent build)

Order: foundation → fusion/ML → agents/UI → RAG → polish/devops → deck.

## Phase 0 — Foundations

- [x] Agent docs + stack vibe (`docs/stack.md`) + ADRs 012–016 (WS, YAML, pipeline, AI provider, twin boot)  
- [ ] Monorepo: `apps/api`, `apps/web`, `apps/ml`, `packages/scenarios`, `docs`  
- [ ] Canonical schemas + zone adjacency graph (from `docs/data-model.md`)  
- [ ] SVG plant layout (6+ zones)  
- [ ] ≥3 YAML scenarios with ground-truth `incident_at_sec`  
- [x] Pytest scenario eval harness (all packaged YAMLs) + health/run smoke  
- [ ] Vitest + WS test helper (web)  

## Phase 0b — Brain spine stubs

- [ ] Context engine + derived facts modules  
- [ ] Assessment pipeline + baseline path  
- [ ] Decision state machine  
- [ ] AI provider interface (`mock` default)  
- [ ] WebSocket hub fanout  


## Phase 1 — Twin + baseline

- [ ] High-quality simulator (noise, trends, permit lifecycle)  
- [ ] Event bus + WebSocket/SSE  
- [ ] Single-sensor baseline alerter  
- [ ] Scenario play / pause / scrub API  

## Phase 2 — ML + fusion (core uniqueness)

- [ ] Feature engineering (levels, slopes, proximity, permit one-hots, shift flags)  
- [ ] Train compound risk classifier on synthetic labels  
- [ ] Rule guardrails for known-lethal combos  
- [ ] Factor contribution / explanation payload  
- [ ] Metrics: lead time, FN, precision vs baseline  

## Phase 3 — Agents + orchestrator

- [ ] Sensor / Permit / Ops agents as real modules  
- [ ] Fusion coordinator (LangGraph or clean pipeline)  
- [ ] Action playbooks: alert · block permit · escalate · evidence  
- [ ] Audit log of recommendations  

## Phase 4 — Frontend product

- [x] Plant twin zone labels + risk tint + live PTW strip  
- [x] Factor evidence + “what to do now” on critical cards  
- [x] Baseline vs fusion comparison strip (proof line + metrics)  
- [x] Live fusion-vs-baseline race strip (baseline.fire on twin)  
- [ ] Extra demo polish (loading microcopy / motion)  

## Phase 5 — RAG (full, attached to actions)

- [ ] Corpus build (OISD / Factory Act / PTW procedure excerpts)  
- [ ] Embeddings + vector store  
- [x] Alert-attached citations + “what to do now” (static corpus; vectors later)  
- [ ] Optional HSE chat with citations  

## Phase 6 — DevOps + reliability

- [x] Docker Compose (api + web; nginx proxies `/api` + WS)  
- [x] API healthcheck + `.env.example`  
- [ ] Seed script: scenarios + model artifact + corpus (artifacts already in-repo)  
- [ ] Optional vector DB / redis when RAG is live  

## Phase 7 — Demo package

- [x] Architecture diagram (matches running system)  
- [x] 90–120s demo script (`docs/demo-script.md`)  
- [x] Deck outline (`docs/deck.md` → paste into Gamma/PPT)  
- [ ] Recorded 90–120s demo video  
- [x] README one-command path  

## Stretch (if crushing it)

- [ ] Simple CV stub (PPE / zone intrusion) as side signal into fusion  
- [ ] Neo4j equipment–permit–hazard graph view  
- [ ] Multi-plant config packs  

## Definition of done

Stranger runs Compose → plays scenario → baseline late → fusion CRITICAL early → permit blocked → cites + metrics. That is the bar.