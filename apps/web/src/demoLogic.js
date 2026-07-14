/** Pure helpers for the twin / assessment UI (unit-tested). */

export function actionLabel(action) {
  return (
    {
      block_permit: "Block permit",
      escalate: "Escalate",
      evacuate: "Evacuate",
      alert: "Acknowledge",
    }[action] || "Act"
  );
}

/** Emergency playbook steps shown under every critical assessment (PRD F12). */
export function playbookSteps(action) {
  return (
    {
      block_permit: [
        ["Abort", "Stop the work front and withdraw crews from the hot zone"],
        ["Notify", "Inform shift supervisor / control room of the compound hold"],
        ["Preserve", "Keep the PTW blocked and freeze the evidence pack"],
      ],
      escalate: [
        ["Abort", "Pause SIMOPS until the elevated atmosphere clears"],
        ["Notify", "Escalate to area owner and HSE on-call"],
        ["Preserve", "Hold permits in request and retain sensor traces"],
      ],
      evacuate: [
        ["Abort", "Withdraw all personnel from the affected zones"],
        ["Notify", "Activate emergency notification / muster"],
        ["Preserve", "Secure valves/power as SOP; do not reset permits"],
      ],
      alert: [
        ["Watch", "Increase monitoring frequency on the lit agents"],
        ["Notify", "Brief the permit issuer before approving work"],
        ["Preserve", "Keep the assessment trail attached to the PTW"],
      ],
    }[action] || [
      ["Abort", "Hold work until compound risk clears"],
      ["Notify", "Alert control room"],
      ["Preserve", "Keep evidence attached to the decision"],
    ]
  );
}

export function zoneTitle(id) {
  return (id || "")
    .replace(/^zone_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function permitLabel(p) {
  const kind = (p.permit_type || "permit").replaceAll("_", " ");
  return `${kind} · ${zoneTitle(p.zone_id)} · ${p.status}`;
}

export function scorePct(a) {
  if (a?.model_score != null) return Math.round(a.model_score * 100);
  if (a?.score != null) return Math.round(a.score * 100);
  return null;
}

export function fmt(v, unit = "s") {
  if (v == null) return "—";
  return `@${v}${unit}`;
}

export function computeLead(critical, baselineFire, metrics) {
  if (critical && baselineFire && baselineFire.t_sec > critical.t_sec) {
    return baselineFire.t_sec - critical.t_sec;
  }
  return metrics?.lead_time_sec ?? null;
}

export function wsUrl(scenarioId, host = window.location.host, protocol = window.location.protocol) {
  const proto = protocol === "https:" ? "wss" : "ws";
  return `${proto}://${host}/api/v1/ws/scenarios/${scenarioId}`;
}
