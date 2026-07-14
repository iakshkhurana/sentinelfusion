# Decisions (ADR log) — SentinelFusion

Lightweight architecture decision records. **Do not relitigate** without a new ADR entry.

Format: date · decision · status · why · alternatives rejected.

---

## ADR-001 — Problem & product wedge

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** Build Problem 1 as **SentinelFusion**: compound risk fusion + digital permit intelligence + geospatial plant UI + RAG citations + eval vs single-sensor baseline.  
- **Why:** Highest uniqueness + judge alignment; not another SOP chatbot.  
- **Rejected:** Problem 8 as hero (commodity RAG); making RAG/chat the primary demo.

---

## ADR-002 — Monorepo layout

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** `apps/api`, `apps/web`, `apps/ml`, `packages/scenarios`, `docs`.  
- **Why:** Clear ownership; ML artifacts and scenarios versioned with the product.  
- **Rejected:** Single tangled package; separate repos for hackathon.

---

## ADR-003 — Backend = FastAPI

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** FastAPI + Pydantic v2 + Uvicorn.  
- **Why:** Fast to ship, native WebSockets, fits agents/ML Python stack.  
- **Rejected:** Django, Nest/Node for core fusion (split language for ML later is OK for web only).

---

## ADR-004 — Frontend = React + Vite + TypeScript

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** React 18+ with Vite and strict TypeScript.  
- **Why:** Team strength + excellent geo/ops UI velocity.  
- **Rejected:** Next.js (SSR not needed for demo).

---

## ADR-005 — Postgres + pgvector (not SQLite / Chroma)

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** Postgres for app data; pgvector in the same DB for RAG embeddings. Run via Docker Compose.  
- **Why:** One datastore, excellent-project credibility, simpler ops than DB + separate vector service.  
- **Rejected:** SQLite-only (weak for concurrent stream + vectors); standalone Chroma as primary store.

---

## ADR-006 — Plant map = SVG layout first

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** Authored SVG / structured zone polygons for the plant plan.  
- **Why:** Faster polish, full control for demos; enough for geospatial evidence quality.  
- **Rejected:** Full GIS stack (MapLibre/GeoServer) as P0. Revisit only if multi-site geo is required.

---

## ADR-007 — Realtime = SSE

- **Date:** 2026-07-14  
- **Status:** Superseded by ADR-012  
- **Decision:** Server-Sent Events for scenario/risk streams.  
- **Why:** (original) One-way tick stream; simpler than WebSockets.  
- **Rejected:** —  

---

## ADR-008 — Fusion = ML scorer + rule guardrails

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** Engineered features → ML risk model; hard rules can force CRITICAL and cannot be downgraded by ML.  
- **Why:** Judges want AI/ML; safety demos need deterministic lethal-combo guarantees.  
- **Rejected:** Rules-only (under-sells AI); pure black-box ML without explanations/guardrails.

---

## ADR-009 — Agents = modular pipeline; LangGraph optional

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** Sensor / Permit / Ops / Fusion / Orchestrator / RAG as clear modules. Introduce LangGraph only if stateful branching becomes painful.  
- **Why:** Avoid architecture theatre; keep contracts testable.  
- **Rejected:** “Multi-agent” labels on a single function; LangGraph as day-one hard dependency.

---

## ADR-010 — Human gate for high blast-radius actions

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** Evacuate / plant-wide actions require `confirm=true` (or UI confirm). Permit **recommend-block** can be automatic in demo mode.  
- **Why:** Credible safety product; avoids reckless autonomy narrative.  

---

## ADR-011 — Package managers

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** `uv` for Python; `pnpm` for JS.  
- **Why:** Fast, modern, reproducible.  
- **Rejected:** Ad-hoc system pip / npm without lockfiles.

---

## ADR-012 — Realtime = WebSocket broadcast bus

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** WebSocket fanout per run (`/api/v1/ws/runs/{run_id}`) for twin ticks, derived facts, assessments, decision transitions, metrics, AI errors. REST for commands.  
- **Why:** Twin + assessment + decision panels must pulse together; demo control feels alive; bidirectional-friendly.  
- **Rejected:** SSE-only (ADR-007); polling.

---

## ADR-013 — YAML scenario simulator

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** Human-editable YAML scenarios in `packages/scenarios/` replay fake plant events (gas, permits, maint, shifts, compound setups).  
- **Why:** Fast authoring, cinematic demos, non-dev teammates can tweak timelines.  
- **Rejected:** Code-only scenario builders; opaque binary fixtures as the only source.

---

## ADR-014 — Backend spine: context → facts → assessment → decision SM

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** Pipeline modules: **Context Engine** → **Derived Facts** → **Assessment Pipeline** (rules + ML) → **Decision State Machine** (`assessing → recommended → awaiting_decision → confirmed|dismissed → executing → done`).  
- **Why:** Watchable, testable architecture with clear UI mapping (Assessment panel + Decision flow). Inspired by strong twin/assessment builds; named for safety ops, not copied.  
- **Rejected:** Single mega-function “fusion()”; chatbot-as-orchestrator.

---

## ADR-015 — AI provider: mock / OpenAI-compatible / Ollama

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** Pluggable AI provider. Default `AI_PROVIDER=mock` for dev/CI. Demo uses OpenAI-compatible API or Ollama. Structured Pydantic outputs; **one retry**; then **fail visibly** (`ai.error` on WS + UI).  
- **Why:** Dev without keys; demo can go live; never silent AI failure.  
- **Rejected:** Real-API-only (breaks CI); infinite retries; swallowing LLM errors.

---

## ADR-016 — Frontend boots Digital Twin Demo Mode

- **Date:** 2026-07-14  
- **Status:** Accepted  
- **Decision:** App opens on Digital Twin in Demo Mode with Assessment panel + Decision flow as primary chrome.  
- **Why:** Instant judge dopamine; product story is spatial and operational.  
- **Rejected:** Settings-first / empty dashboard / chat-first landing.

---

## Template for new ADRs

```md
## ADR-0XX — Title
- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Superseded by ADR-0YY
- **Decision:** …
- **Why:** …
- **Rejected:** …
```
