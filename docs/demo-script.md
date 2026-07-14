# 90–120s demo script — SentinelFusion

Record against `docker compose up --build` → http://localhost:5173

## Beat sheet

| Time | Say / do |
|------|----------|
| 0–15s | **Problem:** sensors stay green while co-occurring gas + hot work write the incident. Single-tag alarms miss combinations. |
| 15–25s | Open twin. “Coastal Integrated Steel — seven zones labeled on the plant.” |
| 25–45s | Select **Hot work beside rising CO** → **Run scenario**. Narrate ticks lighting zones. |
| 45–70s | CRITICAL: **Hot zone** + PTW + **vision** agent lit (camera corroboration). Race strip: Fusion before Baseline. |
| 70–95s | When baseline finally fires, call **“Fusion led by Ns”**. Now-step + **Block permit**. |
| 95–120s | Close: “Same story for confined space and maintenance-on-gas-path. Compose one-command. Eval harness green on all three.” |

## Numbers to quote (hot_work)

- Fusion critical **@300s**, baseline **@420s**, lead **+180s**, incident ground truth **480s**

## Fail-safes

- If WS stalls: `POST /api/v1/scenarios/hot_work_gas_adjacent/run` still returns metrics + assessments.
- If model missing: health shows `model_ready: false` — rules still force lethal combos.
