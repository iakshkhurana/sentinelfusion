import { describe, expect, it } from "vitest";
import { initialRun, onWsClosed, reduceRun, resetRun } from "./runState.js";

describe("reduceRun", () => {
  it("applies twin ticks", () => {
    const next = reduceRun(resetRun(), {
      type: "twin.tick",
      payload: {
        t_sec: 210,
        zones_tint: { zone_coke_oven: 0.7 },
        permits: [{ id: "ptw_1", status: "active" }],
      },
    });
    expect(next.tSec).toBe(210);
    expect(next.zonesTint.zone_coke_oven).toBe(0.7);
    expect(next.permits).toHaveLength(1);
  });

  it("prepends assessments and records baseline", () => {
    let s = resetRun();
    s = reduceRun(s, {
      type: "assessment.upsert",
      payload: { id: "a1", severity: "critical", t_sec: 210 },
    });
    s = reduceRun(s, {
      type: "baseline.fire",
      payload: { t_sec: 330, zone_id: "zone_coke_oven" },
    });
    expect(s.assessments[0].id).toBe("a1");
    expect(s.baselineFire.t_sec).toBe(330);
  });

  it("honors pause control and run.done metrics", () => {
    let s = reduceRun(resetRun(), {
      type: "run.control",
      payload: { status: "paused" },
    });
    expect(s.paused).toBe(true);
    s = reduceRun(s, {
      type: "run.done",
      payload: {
        assessments: [{ id: "final" }],
        metrics: { lead_time_sec: 180, false_negative_baseline: true },
      },
    });
    expect(s.status).toBe("completed");
    expect(s.paused).toBe(false);
    expect(s.metrics.lead_time_sec).toBe(180);
    expect(s.assessments[0].id).toBe("final");
  });

  it("closes a live run as completed", () => {
    const s = onWsClosed({ ...initialRun, status: "running", paused: true });
    expect(s.status).toBe("completed");
    expect(s.paused).toBe(false);
  });
});
