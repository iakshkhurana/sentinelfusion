# Submit checklist — SentinelFusion

Code DoD is met. This is the hand-off pack for recording + submission.

## Before you record

1. `docker compose up --build` (or local API + `npm run dev`)
2. `pwsh scripts/verify.ps1` (or `bash scripts/verify.sh`)
3. `python scripts/eval_report.py` — paste table into deck slide 6 if numbers changed
4. Open http://localhost:5173 — hard refresh

## 90–120s video (record this)

Follow [`docs/demo-script.md`](demo-script.md) beat-for-beat.

Suggested clicks:

1. Scenario: **Hot work beside rising CO**
2. **Run** → optional **Skip ahead** → **Pause** on CRITICAL
3. Point: zone labels · Active PTW · vision pill · race strip · adjacency arc
4. **Resume** → proof metrics → citation **Now** → **Block permit** → audit line
5. Optional: **HSE ask** `hot work near gas`

Export 1080p; no hackathon branding in title card — product name only.

## Deck

Paste [`docs/deck.md`](deck.md) into Gamma / PPT (8 slides).  
Architecture slide = mermaid from [`docs/architecture.md`](architecture.md) or README.

## Links to keep handy

| Item | Where |
|------|-------|
| Repo | GitHub `main` with Compose |
| Twin | http://localhost:5173 |
| API docs | http://localhost:8000/docs |
| Eval | `python scripts/eval_report.py` |
| Script | `docs/demo-script.md` |

## Definition of done (live)

Stranger runs Compose → plays scenario → baseline late → fusion CRITICAL early → permit blocked → cites + metrics.
