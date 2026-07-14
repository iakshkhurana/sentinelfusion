/** WebSocket envelope reducer for the live scenario run. */

export const initialRun = {
  assessments: [],
  metrics: null,
  zonesTint: {},
  permits: [],
  baselineFire: null,
  tSec: 0,
  status: "idle",
  paused: false,
};

export function resetRun(status = "running") {
  return {
    ...initialRun,
    status,
  };
}

export function reduceRun(state, msg) {
  if (!msg || !msg.type) return state;
  switch (msg.type) {
    case "twin.tick":
      return {
        ...state,
        tSec: msg.payload?.t_sec ?? 0,
        zonesTint: msg.payload?.zones_tint || {},
        permits: msg.payload?.permits || [],
      };
    case "assessment.upsert":
      return {
        ...state,
        assessments: [msg.payload, ...state.assessments],
      };
    case "baseline.fire":
      return { ...state, baselineFire: msg.payload };
    case "run.control":
      return {
        ...state,
        paused: msg.payload?.status === "paused",
      };
    case "run.done":
      return {
        ...state,
        assessments: msg.payload?.assessments || [],
        metrics: msg.payload?.metrics || null,
        paused: false,
        status: "completed",
      };
    default:
      return state;
  }
}

export function onWsClosed(state) {
  return {
    ...state,
    paused: false,
    status: state.status === "running" ? "completed" : state.status,
  };
}
