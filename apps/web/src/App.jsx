import { useEffect, useMemo, useRef, useState } from "react";

async function getJson(path, init) {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function wsUrl(scenarioId) {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/api/v1/ws/scenarios/${scenarioId}`;
}

function actionLabel(action) {
  return {
    block_permit: "Block permit",
    escalate: "Escalate",
    evacuate: "Confirm evacuate",
    alert: "Acknowledge",
  }[action] || "Decide";
}

function zoneFill(zoneId, criticalZoneId, zonesTint, gasZones) {
  if (zoneId === criticalZoneId) return "rgba(255, 90, 79, 0.72)";
  const level = zonesTint[zoneId] ?? 0;
  if (level > 0 || gasZones.has(zoneId)) {
    const a = 0.28 + Math.max(level, gasZones.has(zoneId) ? 0.4 : 0) * 0.5;
    return `rgba(230, 184, 77, ${a})`;
  }
  return "rgba(40, 70, 58, 0.55)";
}

export default function App() {
  const [plant, setPlant] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [scenarioId, setScenarioId] = useState("hot_work_gas_adjacent");
  const [assessments, setAssessments] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [zonesTint, setZonesTint] = useState({});
  const [tSec, setTSec] = useState(0);
  const [status, setStatus] = useState("idle");
  const [decision, setDecision] = useState(null);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    Promise.all([getJson("/api/v1/plant/layout"), getJson("/api/v1/scenarios")])
      .then(([layout, list]) => {
        setPlant(layout);
        setScenarios(list);
        if (list[0]) setScenarioId(list[0].id);
      })
      .catch((e) => setError(e.message));
    return () => wsRef.current?.close();
  }, []);

  const critical = assessments[0] ?? null;
  const gasZones = useMemo(
    () => new Set(critical?.gas_zone_ids?.length ? critical.gas_zone_ids : []),
    [critical],
  );

  function onPlay() {
    setError(null);
    setAssessments([]);
    setMetrics(null);
    setDecision(null);
    setZonesTint({});
    setTSec(0);
    setStatus("running");
    wsRef.current?.close();

    const ws = new WebSocket(wsUrl(scenarioId));
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "twin.tick") {
        setTSec(msg.payload.t_sec ?? 0);
        setZonesTint(msg.payload.zones_tint || {});
      }
      if (msg.type === "assessment.upsert") {
        setAssessments((prev) => [msg.payload, ...prev]);
      }
      if (msg.type === "run.done") {
        setAssessments(msg.payload.assessments || []);
        setMetrics(msg.payload.metrics || null);
        setStatus("completed");
      }
    };
    ws.onerror = () => {
      setError("WebSocket failed — is the API running?");
      setStatus("error");
    };
    ws.onclose = () => {
      setStatus((s) => (s === "running" ? "completed" : s));
    };
  }

  async function onDecide(assessment) {
    setDeciding(true);
    setError(null);
    try {
      const needsConfirm = assessment.recommended_action === "evacuate";
      const out = await getJson(`/api/v1/assessments/${assessment.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: needsConfirm ? true : false }),
      });
      setDecision(out);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeciding(false);
    }
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>SentinelFusion</h1>
          <p>Digital Twin · Demo Mode · live</p>
        </div>
        <div className="pill">DEMO MODE</div>
      </header>

      <div className="grid">
        <section className="panel">
          <div className="row">
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              disabled={status === "running"}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <button
              className="primary"
              type="button"
              onClick={onPlay}
              disabled={status === "running"}
            >
              {status === "running" ? "Streaming…" : "Play scenario"}
            </button>
          </div>

          <div className="meta">
            <span>t = {tSec}s</span>
            <span>status = {status}</span>
            {metrics && (
              <>
                <span>fusion @ {metrics.fusion_first_critical_sec ?? "—"}s</span>
                <span>baseline @ {metrics.baseline_first_fire_sec ?? "—"}s</span>
                <span>lead {metrics.lead_time_sec ?? "—"}s</span>
              </>
            )}
          </div>
          {error && <p className="muted">Error: {error}</p>}

          {!plant ? (
            <p className="muted">Loading plant…</p>
          ) : (
            <svg
              className="twin"
              viewBox={`0 0 ${plant.width} ${plant.height}`}
              role="img"
              aria-label={plant.name}
            >
              <rect width={plant.width} height={plant.height} fill="#0a100e" />
              {plant.zones.map((z) => {
                const points = z.polygon.map((p) => p.join(",")).join(" ");
                const cx = z.polygon.reduce((s, p) => s + p[0], 0) / z.polygon.length;
                const cy = z.polygon.reduce((s, p) => s + p[1], 0) / z.polygon.length;
                return (
                  <g key={z.id}>
                    <polygon
                      points={points}
                      fill={zoneFill(z.id, critical?.zone_id, zonesTint, gasZones)}
                      stroke={
                        z.id === critical?.zone_id
                          ? "rgba(255,90,79,0.95)"
                          : "rgba(232,240,235,0.25)"
                      }
                      strokeWidth="2"
                    />
                    <text className="zone-label" x={cx} y={cy} textAnchor="middle">
                      {z.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </section>

        <aside className="panel">
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Assessment</h2>
          {assessments.length === 0 && (
            <p className="muted">Play a scenario — watch risk form as ticks stream in.</p>
          )}
          {assessments.map((a, i) => (
            <article key={`${a.id || a.title}-${i}`} className={`card ${a.severity}`}>
              <div className="sev">{a.severity}</div>
              <strong>{a.title}</strong>
              <div className="meta">
                <span>t={a.t_sec}s</span>
                <span>{a.recommended_action?.replaceAll("_", " ")}</span>
                {a.model_score != null && (
                  <span>model {(a.model_score * 100).toFixed(0)}%</span>
                )}
                {a.rule_forced && <span>rule guard</span>}
                {a.baseline_miss && <span>beats baseline</span>}
              </div>
              <ul>
                {a.factors?.map((f) => (
                  <li key={f.code}>{f.label}</li>
                ))}
              </ul>
              {a.citations?.length > 0 && (
                <div className="cites">
                  {a.citations.map((c) => (
                    <blockquote key={c.code}>
                      <strong>{c.source}</strong>
                      <span>{c.excerpt}</span>
                    </blockquote>
                  ))}
                </div>
              )}

              {a.id && (
                <div className="row" style={{ marginTop: "0.65rem", marginBottom: 0 }}>
                  <button
                    className="danger"
                    type="button"
                    disabled={deciding || decision?.assessment_id === a.id}
                    onClick={() => onDecide(a)}
                  >
                    {decision?.assessment_id === a.id
                      ? "Decision executed"
                      : actionLabel(a.recommended_action)}
                  </button>
                </div>
              )}
            </article>
          ))}

          <h2 style={{ marginTop: "1.25rem", fontSize: "1rem" }}>Decision</h2>
          {!decision && <p className="muted">Execute the recommended action from an assessment.</p>}
          {decision && (
            <article className="card ok">
              <div className="sev ok-sev">{decision.state}</div>
              <strong>{decision.message}</strong>
              <div className="meta">
                <span>{decision.action.replaceAll("_", " ")}</span>
                {decision.blocked_permit_ids?.length > 0 && (
                  <span>permits: {decision.blocked_permit_ids.join(", ")}</span>
                )}
              </div>
            </article>
          )}
        </aside>
      </div>
    </div>
  );
}
