import { useEffect, useState, useRef } from "react";
import PlantScene3D from "./PlantScene3D.jsx";

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
    evacuate: "Evacuate",
    alert: "Acknowledge",
  }[action] || "Act";
}

function zoneTitle(id) {
  return (id || "")
    .replace(/^zone_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function permitLabel(p) {
  const kind = (p.permit_type || "permit").replaceAll("_", " ");
  return `${kind} · ${zoneTitle(p.zone_id)} · ${p.status}`;
}

export default function App() {
  const [plant, setPlant] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [scenarioId, setScenarioId] = useState("hot_work_gas_adjacent");
  const [assessments, setAssessments] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [zonesTint, setZonesTint] = useState({});
  const [permits, setPermits] = useState([]);
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
  const livePermits = permits.filter((p) =>
    ["requested", "active"].includes(p.status),
  );

  function onPlay() {
    setError(null);
    setAssessments([]);
    setMetrics(null);
    setDecision(null);
    setZonesTint({});
    setPermits([]);
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
        setPermits(msg.payload.permits || []);
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
      setError("API unreachable — start uvicorn on :8000");
      setStatus("error");
    };
    ws.onclose = () => setStatus((s) => (s === "running" ? "completed" : s));
  }

  async function onDecide(assessment) {
    setDeciding(true);
    setError(null);
    try {
      const out = await getJson(`/api/v1/assessments/${assessment.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: assessment.recommended_action === "evacuate",
        }),
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
      <div className="viewport">
        {plant ? (
          <PlantScene3D
            plant={plant}
            zonesTint={zonesTint}
            criticalZoneId={critical?.zone_id}
          />
        ) : (
          <div className="loading">Loading plant layout…</div>
        )}

        <div className="hud-top">
          <div className="brand">
            <span className="mark" />
            <div>
              <strong>SentinelFusion</strong>
              <small>{plant?.name || "Plant twin"}</small>
            </div>
          </div>

          <div className="controls">
            <label>
              Scenario
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
            </label>
            <button type="button" className="btn-primary" onClick={onPlay} disabled={status === "running"}>
              {status === "running" ? "Running…" : "Run scenario"}
            </button>
          </div>

          <div className="status-chip">
            <span className={`dot ${status}`} />
            <span>{status === "running" ? "LIVE" : status.toUpperCase()}</span>
            <span className="t">{tSec}s</span>
          </div>
        </div>

        {livePermits.length > 0 && (
          <div className="ptw-strip">
            <span className="ptw-label">Active PTW</span>
            {livePermits.map((p) => (
              <span key={p.id} className={`ptw-chip ${p.permit_type || ""}`}>
                {permitLabel(p)}
              </span>
            ))}
          </div>
        )}

        <div className="legend">
          <span><i className="c-ok" /> Clear</span>
          <span><i className="c-warn" /> Elevated</span>
          <span><i className="c-crit" /> Critical</span>
        </div>

        {critical && (
          <div className="hot-chip">
            <span>Hot zone</span>
            <strong>{zoneTitle(critical.zone_id)}</strong>
            <em>{critical.severity}</em>
          </div>
        )}
      </div>

      <aside className="panel">
        <header>
          <h1>Assessment</h1>
          <p>Compound risk vs single-sensor baseline</p>
        </header>

        {metrics && (
          <section className="proof">
            <p className="proof-line">
              Fusion critical at <b>@{metrics.fusion_first_critical_sec ?? "—"}s</b>
              {" · "}
              baseline{" "}
              {metrics.baseline_first_fire_sec == null
                ? "missed"
                : `fired @${metrics.baseline_first_fire_sec}s`}
              {" · "}
              <span className="lead">+{metrics.lead_time_sec ?? "—"}s lead</span>
            </p>
            <div className="metrics">
              <div>
                <small>Fusion first</small>
                <b>@{metrics.fusion_first_critical_sec ?? "—"}s</b>
              </div>
              <div>
                <small>Baseline</small>
                <b>@{metrics.baseline_first_fire_sec ?? "—"}s</b>
              </div>
              <div>
                <small>Lead time</small>
                <b className="lead">{metrics.lead_time_sec ?? "—"}s</b>
              </div>
            </div>
          </section>
        )}

        <div className="feed">
          {assessments.length === 0 && !decision && (
            <p className="empty">
              Select a scenario and run it. Zones and PTWs update live — then act from this panel.
            </p>
          )}

          {assessments.map((a) => {
            const cite = a.citations?.[0];
            return (
              <article key={a.id || a.title} className={`card ${a.severity}`}>
                <div className="card-head">
                  <h2>{a.title}</h2>
                  <span className="score">
                    {a.model_score != null ? `${(a.model_score * 100).toFixed(0)}%` : "—"}
                  </span>
                </div>
                <ul>
                  {a.factors?.slice(0, 3).map((f) => (
                    <li key={f.code}>{f.label}</li>
                  ))}
                </ul>
                {a.related_permit_ids?.length > 0 && (
                  <p className="permit-ids">PTW: {a.related_permit_ids.join(", ")}</p>
                )}
                {cite && (
                  <div className="evidence">
                    <p className="cite">{cite.source}</p>
                    {cite.excerpt && <p className="excerpt">{cite.excerpt}</p>}
                    {cite.next_step && (
                      <p className="next-step">
                        <span>Now</span> {cite.next_step}
                      </p>
                    )}
                  </div>
                )}
                {a.id && (
                  <button
                    type="button"
                    className="btn-act"
                    disabled={deciding || decision?.assessment_id === a.id}
                    onClick={() => onDecide(a)}
                  >
                    {decision?.assessment_id === a.id ? "Executed" : actionLabel(a.recommended_action)}
                  </button>
                )}
              </article>
            );
          })}

          {decision && (
            <article className="card ok">
              <div className="card-head">
                <h2>{decision.message}</h2>
                <span className="score">OK</span>
              </div>
              {decision.blocked_permit_ids?.length > 0 && (
                <p className="permit-ids">Blocked: {decision.blocked_permit_ids.join(", ")}</p>
              )}
            </article>
          )}
        </div>

        {error && <p className="error">{error}</p>}
      </aside>
    </div>
  );
}
