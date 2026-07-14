# PRD — SentinelFusion

## Vision

The industrial safety product that feels inevitable after you see it: **one map, one fusion brain, one action path** that catches compound hazards and proves it numerically against dumb single-sensor baselines.

## Problem

Data is siloed across SCADA, PTW, maintenance, and shift logs. Fatal conditions are multi-factor. SOP chatbots do not close that gap.

## Goals

1. Best-in-class **compound risk** demo for ET AI Hackathon 2026 (Problem 1).  
2. Showcase **AI + ML + RAG + multi-agent + geo UX** without losing a sharp product story.  
3. Beat single-sensor baselines on lead time and false negatives on our scenario suite.  
4. Make judges feel “this could ship to a plant safety team.”

## Non-goals (v1 still)

- Live connection to a real steel plant SCADA  
- Certified functional safety / SIL claims  
- Exhaustive legal corpus coverage  
- Replacing human emergency command authority  

## Personas

| Persona | Success look |
|---------|--------------|
| Safety officer | Sees compounding risk early, trusts explanation |
| Permit coordinator | Unsafe permit never quietly approved |
| HSE / auditor | Evidence pack + citations |
| Judge | Understands unique value in under 2 minutes |

## Unique value prop

> Open a living plant twin, watch derived facts become a compound assessment, then run a decision flow that blocks unsafe work — with receipts and lead-time proof.

## UI open state (P0)

App launches on **Digital Twin · Demo Mode** with Assessment panel + Decision flow visible. Not chat-first.

## Functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F1 | Multi-stream plant digital twin / simulator | P0 |
| F2 | Single-sensor baseline alerter | P0 |
| F3 | Feature pipeline + ML compound risk scorer | P0 |
| F4 | Rule guardrails for known lethal SIMOPS patterns | P0 |
| F5 | Agentized evaluators (sensor / permit / ops) feeding fusion | P0 |
| F6 | Live geospatial heatmap + permit overlays | P0 |
| F7 | Orchestrated actions: alert, block, escalate, evidence | P0 |
| F8 | RAG citations + short procedural guidance on alerts | P0 |
| F9 | Scenario replay, scrub, A/B baseline toggle | P0 |
| F10 | Metrics dashboard: lead time, FN, precision | P0 |
| F11 | Optional free-form compliance chat | P1 |
| F12 | Emergency playbook (evacuate / notify / preserve) | P1 |
| F13 | Docker Compose production-like demo | P0 |

## Compound risk library (minimum 3)

1. Hot work adjacent to elevated flammable/toxic gas  
2. Confined-space entry under abnormal process conditions  
3. Maintenance on gas-handling path while detectors trend up  
4. (Stretch) Multi-permit SIMOPS at shift handover  

## UX principles

- One hero composition: plant + risk intelligence (not a random dashboard farm)  
- Every critical alert: **where · why factors · what to do · cites · proof vs baseline**  
- Motion for live risk propagation; keep UI calm and operational  

## Quality bar (“bahut achha project”)

- Coherent brand + polished UI  
- Clear architecture diagram that matches code  
- Reproducible eval numbers  
- Demo video that tells the Vizag-pattern story without cringe  
- README that a stranger can run in minutes  

## Acceptance criteria

- [ ] ≥3 labeled scenarios; fusion beats baseline on each for lead time or catch  
- [ ] ML scorer + rule guardrails both visible in architecture  
- [ ] Agents have clear inputs/outputs (not fake labels on one function)  
- [ ] RAG cites on every CRITICAL alert  
- [ ] Geo map + metrics + action path in one flow  
- [ ] `docker compose up` boots the demo  

## Judging alignment

| Criterion | How we score |
|-----------|--------------|
| Innovation 25% | Compound fusion + permit intelligence (not SOP chat) |
| Business impact 25% | Lives + downtime + auditability narrative |
| Technical excellence 20% | ML + agents + RAG + realtime geo + eval |
| Scalability 15% | Multi-zone plant pack / scenario packs / Compose |
| UX 15% | Map-first operational UI |
