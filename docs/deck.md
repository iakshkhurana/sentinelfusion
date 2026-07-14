# Pitch deck outline — SentinelFusion

Copy into Gamma / PPT. Keep to **8 slides**. No hackathon branding.

---

## 1 — Title
**SentinelFusion**  
Industrial safety intelligence for compound risk  
*See the combination. Decide before the siren.*

## 2 — The miss
Sensors, SCADA, and permits each stay green.  
Fatal incidents often come from **co-occurring** conditions no single alarm owns.  
Gas trend below threshold × hot work next door × confined entry.

## 3 — Unique wedge
Not another SOP chatbot.  
A **watchable plant twin** that fuses streams → compound assessment → **decision** (block / escalate) with citations and **lead-time proof** vs single-sensor baseline.

## 4 — How it works
YAML → **sensor / permit / ops agents** → coordinator (**rules + ML**) → WebSocket twin  
Baseline path runs in parallel for A/B proof.  
Citations attach “what to do now.”

## 5 — Live demo (60–90s)
Compose up → **Hot work beside rising CO**  
Point: zone labels · Active PTW · Fusion CRITICAL first · Baseline late · Block permit · Now-step + cite.

## 6 — Proof numbers
| Scenario family | Fusion | Baseline | Lead |
|-----------------|--------|----------|------|
| Hot work + gas | @300s | @420s | **+180s** |
| Confined + abnormal | @240s | @390s | **+180s** |
| Maint on gas path | @270s | @420s | **+180s** |

Eval harness: `cd apps/api && python -m pytest -q`

## 7 — Architecture
API (FastAPI) · Three.js twin · YAML packs · compound model artifact · Compose one-command  
(diagram: `docs/architecture.md`)

## 8 — Ask / next
Plant pilot: connect live tags + PTW feed · expand corpus · multi-site packs.  
**Today:** stranger runs Compose and recreates the win in minutes.
