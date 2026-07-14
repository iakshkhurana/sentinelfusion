# 90–120s demo script — SentinelFusion

Record against `docker compose up --build` → http://localhost:5173  
Export 1080p. Product name only — no hackathon branding.

**Setup before record:** Hot work scenario selected · browser full screen · mute notifications.

---

## Teleprompter (bolne wala full script)

*[0–15s — camera on UI, don’t click yet]*

> Heavy industry already has sensors, SCADA, and permits — yet people still die from **combinations** no single alarm owns. Gas rises next door. Hot work gets approved. Every system stays green. Together, they write the incident report. That’s the miss SentinelFusion closes.

*[15–25s — pan twin / hover zones]*

> This is **Coastal Integrated Steel** — a live plant twin. Seven zones, labels on the map, risk tints as conditions change. Demo mode boots straight into operations — not a chatbot.

*[25–40s — Scenario: Hot work beside rising CO → Run scenario]*  
*(If slow: hit **Skip ahead**, then Pause when CRITICAL appears.)*

> I’m running **Hot work beside rising CO**. CO climbs in the coke oven while a hot-work permit sits in the adjacent maintenance bay. Sensor, permit, ops, and vision agents fuse that into one assessment — a compound path a single gas tag would still treat as quiet.

*[40–70s — CRITICAL → Pause. Point: Hot zone · PTW chip · agent grid · race card · playbook]*

> There — fusion goes **CRITICAL**. I’m pausing. Hot zone lights on the twin. Active PTW is visible. Agents show the facts. Race strip: **fusion critical first**, baseline still silent. Assessment shows why it fired, the emergency playbook — abort, notify, preserve — and a cited **Now** step from industrial guidance.

*[70–95s — Resume. Wait for baseline fire / led-by line. Click Block permit]*

> Resuming. Watch the baseline — the single-sensor path — fire late. **Fusion led by about one hundred eighty seconds.** Lead time versus a late siren. I execute the decision: **Block permit.** Unsafe work does not quietly stay approved. Audit keeps the receipt.

*[95–115s — optional: Knowledge → ask “hot work near gas” — or skip straight to close]*

> Optional close: HSE knowledge — “hot work near gas” — same citation layer that grounds the alert. Not the product’s hero. The hero is fusion plus decide on the twin.

*[115–120s — freeze on metrics / twin]*

> Stranger path: `docker compose up`, play the scenario, prove the lead. Three packed scenarios plus a multi-permit SIMOPS case — all green on the eval harness. SentinelFusion: **see the combination, decide before the siren.**

---

## Click checklist (screen pe)

1. Scenario dropdown → **Hot work beside rising CO**
2. **Run scenario** (optional **Skip ahead** if you need time)
3. On CRITICAL → **Pause** → point twin / assessment
4. **Resume** → wait for “Fusion led by …” / baseline fire
5. **Block permit** → flash Audit if time
6. Optional Knowledge ask: `hot work near gas`

## Numbers to quote (hot_work)

| Metric | Value |
|--------|--------|
| Fusion critical | **@300s** |
| Baseline fire | **@420s** |
| Lead | **+180s** |
| Incident ground truth | **@480s** |

## Short Hindi/Hinglish (agar bolna easy lage)

> Industry mein sensors aur permits pehle se hain — phir bhi accidents combination se hote hain. Yeh Coastal Integrated Steel ka digital twin hai. Hot work beside rising CO chalaata hoon. Fusion pehle CRITICAL — baseline abhi silent. Pause. Agents, PTW, playbook, citation. Resume — baseline late; fusion roughly **+180 seconds** lead. Block permit. Compose se koi bhi yeh proof dekh sakta hai. **See the combination. Decide before the siren.**

## Alternate 20s close (SIMOPS)

Scenario → **Multi-permit SIMOPS at shift handover** → Run → on CRITICAL:  
> Concurrent hot work and confined-space permits at handover. Fusion @210s blocks **both** PTWs — baseline @330s. That’s compound SIMOPS intelligence, not a single tag.

## Fail-safes

- WS stall → UI still loads; `POST /api/v1/scenarios/hot_work_gas_adjacent/run` returns metrics.
- Model missing → rules still force lethal combos (`model_ready` may be false; demo still works).
