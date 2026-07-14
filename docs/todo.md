# Todo — SentinelFusion (excellent build)

Order: foundation → fusion/ML → agents/UI → RAG → polish/devops → deck.

## Phase 0 — Foundations

- [x] Agent docs + stack vibe (`docs/stack.md`) + ADRs 012–016 (WS, YAML, pipeline, AI provider, twin boot)  
- [ ] Monorepo: `apps/api`, `apps/web`, `apps/ml`, `packages/scenarios`, `docs`  
- [ ] Canonical schemas + zone adjacency graph (from `docs/data-model.md`)  
- [ ] SVG plant layout (6+ zones)  
- [ ] ≥3 YAML scenarios with ground-truth `incident_at_sec`  
- [ ] Skeleton pytest + Vitest + WS test helper per `docs/testing.md`  

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

- [ ] Plant heatmap + permit overlays + adjacency cues  
- [ ] Risk rail + factor evidence drawer  
- [ ] Baseline vs fusion comparison strip  
- [ ] Demo mode polish (brand, motion, empty/loading states)  

## Phase 5 — RAG (full, attached to actions)

- [ ] Corpus build (OISD / Factory Act / PTW procedure excerpts)  
- [ ] Embeddings + vector store  
- [ ] Alert-attached citations + “what to do now”  
- [ ] Optional HSE chat with citations  

## Phase 6 — DevOps + reliability

- [ ] Docker Compose (api, web, vector DB, optional redis)  
- [ ] Healthchecks, `.env.example`, seed command  
- [ ] Seed script: scenarios + model artifact + corpus  

## Phase 7 — Hackathon package

- [ ] Architecture diagram (matches running system)  
- [ ] Deck: problem → unique wedge → demo → metrics → scale  
- [ ] 90–120s demo video  
- [ ] README one-command path  

## Stretch (if crushing it)

- [ ] Simple CV stub (PPE / zone intrusion) as side signal into fusion  
- [ ] Neo4j equipment–permit–hazard graph view  
- [ ] Multi-plant config packs  

## Definition of done

Stranger runs Compose → plays scenario → baseline late → fusion CRITICAL early → permit blocked → cites + metrics → judges nod. That is the bar.