# Testing — SentinelFusion

A task is **not done** until the checks below that apply to the change are green. Do not declare victory on “it runs on my machine” alone.

## Quick commands (target)

```bash
# API
cd apps/api && python -m pytest -q

# Web
cd apps/web && npm test

# ML unit / training smoke
cd apps/ml && uv run pytest -q

# Full demo stack
docker compose up --build -d
curl -sf http://localhost:8000/api/v1/health
```

Adjust ports if Compose maps differently; keep `.env.example` truthful.

## What must pass by change type

| You changed… | Must pass |
|--------------|-----------|
| Fusion / agents / scoring | API unit tests for rules + scoring; scenario eval harness for ≥1 scenario |
| Data model / API contracts | Pydantic/schema tests; update `docs/data-model.md` + `docs/api.md` |
| Simulator / scenarios | Replay test: deterministic golden ticks or hash of key events |
| RAG | Citation attach returns ≥1 cite on a CRITICAL fixture event (can mock embeddings) |
| Web UI / twin / WS | Hook tests for WS envelope handling; smoke play/pause + assessment panel |
| Docker / devops | `docker compose up` healthcheck + `/health` |

## Scenario eval harness (definition of quality)

For each packaged scenario in `packages/scenarios`:

1. Run replay headlessly.  
2. Record `baseline_first_fire_sec` and `fusion_first_critical_sec`.  
3. Assert fusion catches with `fusion_first_critical_sec < incident_at_sec`.  
4. Assert fusion is earlier than baseline **or** baseline misses (`baseline_first_fire_sec is null`).  

Minimum gate before demo: **all P0 scenarios pass** this harness.

## Definition of done (any feature PR)

- [ ] Code follows `docs/conventions.md`  
- [ ] No unresolved ADR conflicts (`docs/decisions.md`)  
- [ ] Contracts updated if fields/endpoints changed  
- [ ] Relevant automated tests added/updated and green  
- [ ] Manual smoke path noted in PR/commit message if UI  
- [ ] No secrets committed  

## Definition of done (end-to-end vertical slice)

- [ ] `docker compose up` brings API + web + DB  
- [ ] ≥3 scenarios pass eval harness  
- [ ] UI shows baseline vs fusion + permit block + citations  
- [ ] Metrics endpoint matches on-screen numbers  

## Test style

- Prefer fast unit tests at context/facts/assessment/decision boundaries  
- Use YAML scenario fixtures; `AI_PROVIDER=mock` in CI (no live LLM)  
- Name tests after behavior: `test_hot_work_gas_adjacent_assessment_beats_baseline`  
- Flaky time tests: control `t_sec` via scrub, don’t sleep  

## When tests don’t exist yet

If the area has no harness, **add a minimal one in the same change** before claiming completion. Skeleton pytest/Vitest setup is part of Phase 0.
