# Todo — SentinelFusion (excellent build)

Order: foundation → fusion/ML → agents/UI → RAG → polish/devops → deck.

## Phase 0 — Foundations

- [x] Agent docs + stack vibe (`docs/stack.md`) + ADRs 012–016 (WS, YAML, pipeline, AI provider, twin boot)  
- [x] Monorepo: `apps/api`, `apps/web`, `apps/ml`, `packages/`  
- [x] Plant pack + zone adjacency (steel_pack_v1)  
- [x] Three.js plant twin (6+ zones)  
- [x] ≥3 YAML scenarios with ground-truth `incident_at_sec`  
- [x] Pytest scenario eval harness (all packaged YAMLs) + health/run smoke  
- [ ] Vitest + WS test helper (web)  

## Phase 0b — Brain spine stubs

- [x] Context / features via agents + feature extractors  
- [x] Assessment pipeline + baseline path  
- [x] Decision state machine  
- [x] AI provider interface (`mock` default)  
- [x] WebSocket scenario fanout  

## Phase 1 — Twin + baseline

- [x] YAML simulator (trends + permit lifecycle in scenarios)  
- [x] WebSocket twin ticks  
- [x] Single-sensor baseline alerter  
- [ ] Scenario pause / scrub API  

## Phase 2 — ML + fusion (core uniqueness)

- [x] Feature engineering + compound classifier artifact  
- [x] Rule guardrails for known-lethal combos  
- [x] Factor + agent explanation payload  
- [x] Metrics: lead time / FN vs baseline  

## Phase 3 — Agents + orchestrator

- [x] Sensor / Permit / Ops agents as real modules (`apps/api/agents/`)  
- [x] Fusion coordinator (clean pipeline; LangGraph later if needed)  
- [x] Action playbooks: alert · block permit · escalate · evidence  
- [x] Audit log UI for `/api/v1/decisions`  

## Phase 4 — Frontend product

- [x] Plant twin zone labels + risk tint + live PTW strip + adjacency arcs  
- [x] Factor evidence + “what to do now” on critical cards  
- [x] Baseline vs fusion comparison strip (proof line + metrics)  
- [x] Live fusion-vs-baseline race strip (baseline.fire on twin)  
- [x] Demo polish: AI mock brief + adjacency arcs (+ race/PTW)  

## Phase 5 — RAG (full, attached to actions)

- [x] Corpus build (`packages/knowledge/excerpts.json` — illustrative)  
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