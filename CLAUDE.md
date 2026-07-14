# SentinelFusion — Claude / agent guide

This repo is **SentinelFusion**: AI industrial safety intelligence for zero-harm plant operations.

**Product hero:** Digital Twin demo → derived facts → compound **assessment** → **decision** (e.g. block permit) → RAG cites → lead time / FN vs single-sensor baseline.  
**Not the hero:** chat-over-SOPs alone.

## Mandatory reading

1. `docs/stack.md` — the vibe + locked shape  
2. `docs/conventions.md` — naming, libraries, never-do  
3. `docs/decisions.md` — ADR log (do not relitigate)  
4. `docs/data-model.md` — types / fields (`Assessment`, `Decision`, `DerivedFact`)  
5. `docs/api.md` — REST + WebSocket  
6. `docs/testing.md` — definition of done  

Also: `docs/overview.md`, `docs/prd.md`, `docs/architecture.md`, `docs/todo.md`.

Cursor: `.cursor/rules/sentinelfusion.mdc` (always on).

## Stack (locked)

| Layer | Choice |
|-------|--------|
| API | FastAPI + Pydantic v2 |
| DB / vectors | Postgres + pgvector |
| Brain | Context → derived facts → assessment → decision SM |
| Simulator | YAML scenarios |
| Realtime | WebSocket broadcast |
| Web | React · boots Digital Twin Demo Mode |
| AI | `mock` \| `openai` \| `ollama` · structured · 1 retry · fail visibly |
| ML | scikit-learn / LightGBM + rule guardrails |
| Package | `uv` + `pnpm` |
| Run | Docker Compose |

New choice → ADR in `docs/decisions.md`.

## Working rules

- Update `data-model.md` + `api.md` when contracts move  
- Do not invent field names  
- Do not downgrade rule-CRITICAL with ML  
- `evacuate` stays in `awaiting_decision` until confirm  
- AI failures must be visible after one retry  
- App home = Digital Twin Demo Mode, not chat  
- Done = `docs/testing.md` checks  

## Demo north star

YAML plays on twin → baseline late/miss → assessment CRITICAL → decision block → cites → metrics (all over WebSocket).
