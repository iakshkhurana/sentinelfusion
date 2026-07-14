import { describe, expect, it } from "vitest";
import {
  actionLabel,
  computeLead,
  fmt,
  playbookSteps,
  scorePct,
  wsUrl,
  zoneTitle,
} from "./demoLogic.js";

describe("demoLogic", () => {
  it("labels decisions", () => {
    expect(actionLabel("block_permit")).toBe("Block permit");
    expect(actionLabel("unknown")).toBe("Act");
  });

  it("formats zone titles", () => {
    expect(zoneTitle("zone_coke_oven")).toBe("Coke Oven");
  });

  it("playbook always has abort/notify/preserve style steps", () => {
    const steps = playbookSteps("block_permit");
    expect(steps).toHaveLength(3);
    expect(steps[0][0]).toBe("Abort");
  });

  it("scorePct prefers model_score", () => {
    expect(scorePct({ model_score: 0.96, score: 0.5 })).toBe(96);
    expect(scorePct({})).toBeNull();
  });

  it("fmt and lead", () => {
    expect(fmt(180)).toBe("@180s");
    expect(fmt(null)).toBe("—");
    expect(
      computeLead({ t_sec: 210 }, { t_sec: 330 }, { lead_time_sec: 999 }),
    ).toBe(120);
    expect(computeLead(null, null, { lead_time_sec: 180 })).toBe(180);
  });

  it("builds ws url", () => {
    expect(wsUrl("hot_work_gas_adjacent", "localhost:5173", "http:")).toBe(
      "ws://localhost:5173/api/v1/ws/scenarios/hot_work_gas_adjacent",
    );
  });
});
