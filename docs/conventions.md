# Conventions — SentinelFusion

Canonical engineering rules. Prefer this over improvising stack or style.

## Repo layout

```text
apps/
  api/          # FastAPI: context, facts, assessment, decision SM, WS, RAG
  web/          # React Digital Twin (Demo Mode) + assessment + decision UI
  ml/           # training, feature builders, model artifacts
packages/
  scenarios/    # YAML timelines, plant layout, ground truth
docs/           # product + agent guidance (this folder)
```

## Naming

| Kind | Convention | Example |
|------|------------|---------|
| Python modules/files | `snake_case` | `fusion_engine.py` |
| Python classes | `PascalCase` | `RiskEvent` |
| Python functions/vars | `snake_case` | `compute_lead_time` |
| TS/React components | `PascalCase` files | `PlantHeatmap.tsx` |
| TS hooks | `use` + camelCase | `useScenarioStream.ts` |
| TS vars/functions | `camelCase` | `riskScore` |
| API paths | kebab-case nouns | `/api/v1/risk-events` |
| JSON / DB fields | `snake_case` | `lead_time_sec` |
| Env vars | `SCREAMING_SNAKE` | `DATABASE_URL` |
| Scenario IDs | `snake_case` | `hot_work_gas_adjacent` |
| Commits | imperative, why-focused | `add fusion lead-time metrics` |

Zone / asset IDs are stable strings: `zone_coke_oven`, `tag_gas_co_01`.

## Preferred libraries (do not casually swap)

| Concern | Use |
|---------|-----|
| API | FastAPI + Pydantic v2 + Uvicorn |
| DB | Postgres + SQLAlchemy 2.x + Alembic |
| Vectors | pgvector (same Postgres) |
| Realtime | WebSocket broadcast per run (`/api/v1/ws/runs/{run_id}`) |
| Brain modules | `context_engine` → `derived_facts` → `assessment` → `decision_sm` |
| AI | Pluggable provider: `mock` (default) \| `openai` \| `ollama`; structured out; 1 retry; fail visibly |
| ML | scikit-learn and/or LightGBM; joblib artifacts in `apps/ml/artifacts/` |
| Embeddings / LLM | OpenAI-compatible via env; Ollama base URL supported |
| Scenarios | YAML in `packages/scenarios/` |
| Web | React 18+, Vite, TypeScript strict; boot → Digital Twin Demo Mode |
| HTTP client (web) | `fetch` or ky — pick one and stick |
| Styling | Tailwind (lock) — industrial twin UI, not purple SaaS sludge |
| Charts/map | SVG plant plan (default); MapLibre only if we outgrow SVG |
| Tests API | pytest + httpx (+ websockets client tests) |
| Tests web | Vitest + Testing Library |
| Lint/format | Ruff (Python), ESLint + Prettier (TS) |
| Packaging | `uv` for Python; `pnpm` for JS |
| Deploy | Docker Compose |

## API / error style

- Version under `/api/v1/...`
- Success: return the resource directly (or `{ data, meta }` if pagination)
- Errors: HTTP status + body:

```json
{
  "error": {
    "code": "permit_conflict",
    "message": "Hot work overlaps elevated gas zone",
    "details": { "permit_id": "ptw_12", "zone_id": "zone_b" }
  }
}
```

- Raise domain exceptions in services; map to HTTP in FastAPI exception handlers
- Never swallow exceptions silently; log with `zone_id` / `scenario_id` / `request_id` when present
- Validation errors from Pydantic stay `422`

## Code style

- Prefer small pure functions for feature math and assessment scoring
- Pipeline modules expose clear contracts: `build_context` → `derive_facts` → `assess` → `transition`
- No circular imports between `context`, `facts`, `assessment`, `decision`, `rag`, `ai`
- AI calls: structured schema only; never untyped free-form into the state machine

- Frontend: functional components; keep scenario stream logic in hooks
- Do not add `useMemo` / `useCallback` by default
- Comments only for non-obvious invariants (e.g. “ML cannot downgrade rule-CRITICAL”)

## Never do

- Never replace compound **assessment + permit intelligence** with a SOP chatbot as the hero feature
- Never swap Postgres / WebSocket / YAML scenarios / AI provider pattern without an ADR in `decisions.md`
- Never invent field names — check `docs/data-model.md` and `docs/api.md` first; update those docs in the same change
- Never commit secrets, `.env`, API keys, or large binary dumps (model weights OK only under `apps/ml/artifacts/` if intentional and git-LFS/not huge)
- Never claim live plant SCADA integration in UI copy
- Never auto-execute evacuate without `confirm=true` / Decision SM `awaiting_decision`
- Never downgrade a rule-guardrail CRITICAL via the ML score
- Never silently fail AI — one retry, then `ai.error` on the wire + UI
- Never land the app on chat/settings first — Digital Twin Demo Mode is home
- Never add CCTV/CV as a hard dependency of the P0 path
- Never mark a task done without following `docs/testing.md`


## Docs that must stay in sync

When you change contracts, update in the **same PR/commit**:

1. `docs/data-model.md`  
2. `docs/api.md`  
3. Tests for the changed surface  
4. ADR in `docs/decisions.md` if a stack/product choice moved  

## Product north star (session reminder)

Hero demo: YAML scenario on the twin → baseline late/miss → assessment CRITICAL → decision block permit → citations → lead-time / FN metrics (all live on WebSocket).
