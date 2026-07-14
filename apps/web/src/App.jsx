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

function fmt(v, unit = "s") {
  if (v == null) return "—";
  return `@${v}${unit}`;
}

export default function App() {
  const [plant, setPlant] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [scenarioId, setScenarioId] = useState("hot_work_gas_adjacent");
  const [assessments, setAssessments] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [zonesTint, setZonesTint] = useState({});
  const [permits, setPermits] = useState([]);
  const [baselineFire, setBaselineFire] = useState(null);
  const [tSec, setTSec] = useState(0);
  const [status, setStatus] = useState("idle");
  const [paused, setPaused] = useState(false);
  const [decision, setDecision] = useState(null);
  const [audit, setAudit] = useState([]);
  const [ask, setAsk] = useState("hot work near gas");
  const [knowledge, setKnowledge] = useState(null);
  const [asking, setAsking] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState(null);
  const [nav, setNav] = useState("twin");
  const wsRef = useRef(null);

  useEffect(() => {
    Promise.all([
      getJson("/api/v1/plant/layout"),
      getJson("/api/v1/scenarios"),
      getJson("/api/v1/decisions").catch(() => []),
    ])
      .then(([layout, list, decisions]) => {
        setPlant(layout);
        setScenarios(list);
        if (list[0]) setScenarioId(list[0].id);
        setAudit(decisions || []);
      })
      .catch((e) => setError(e.message));
    return () => wsRef.current?.close();
  }, []);

  const critical = assessments[0] ?? null;
  const livePermits = permits.filter((p) =>
    ["requested", "active"].includes(p.status),
  );
  const liveLabel = status === "running" ? (paused ? "Paused" : "Live") : status;
  const lead =
    critical && baselineFire && baselineFire.t_sec > critical.t_sec
      ? baselineFire.t_sec - critical.t_sec
      : metrics?.lead_time_sec;

  function onPlay() {
    setError(null);
    setAssessments([]);
    setMetrics(null);
    setDecision(null);
    setZonesTint({});
    setPermits([]);
    setBaselineFire(null);
    setTSec(0);
    setPaused(false);
    setStatus("running");
    setNav("twin");
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
      if (msg.type === "baseline.fire") {
        setBaselineFire(msg.payload);
      }
      if (msg.type === "run.control") {
        setPaused(msg.payload?.status === "paused");
      }
      if (msg.type === "run.done") {
        setAssessments(msg.payload.assessments || []);
        setMetrics(msg.payload.metrics || null);
        setPaused(false);
        setStatus("completed");
      }
    };
    ws.onerror = () => {
      setError("API unreachable — start uvicorn on :8000");
      setStatus("error");
    };
    ws.onclose = () => {
      setPaused(false);
      setStatus((s) => (s === "running" ? "completed" : s));
    };
  }

  function onPauseToggle() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "control", command: paused ? "resume" : "pause" }));
  }

  function onSkipAhead() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const sc = scenarios.find((s) => s.id === scenarioId);
    const incident = sc?.incident_at_sec ?? 480;
    ws.send(
      JSON.stringify({
        type: "control",
        command: "scrub",
        at_sec: Math.max(0, incident - 200),
      }),
    );
  }

  async function onAsk(e) {
    e?.preventDefault?.();
    setAsking(true);
    setError(null);
    try {
      const out = await getJson("/api/v1/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: ask, top_k: 3 }),
      });
      setKnowledge(out);
    } catch (err) {
      setError(err.message);
    } finally {
      setAsking(false);
    }
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
      setAudit(await getJson("/api/v1/decisions"));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeciding(false);
    }
  }

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <strong>SentinelFusion</strong>
            <small>Control room</small>
          </div>
        </div>

        <nav className="rail-nav">
          {[
            ["twin", "Twin"],
            ["risk", "Risk"],
            ["knowledge", "Knowledge"],
            ["audit", "Audit"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={nav === id ? "active" : ""}
              onClick={() => setNav(id)}
            >
              <i className={`ico ${id}`} aria-hidden />
              {label}
            </button>
          ))}
        </nav>

        <div className="rail-foot">
          <span className={`pulse ${status} ${paused ? "paused" : ""}`} />
          <div>
            <strong>{liveLabel}</strong>
            <small>{plant?.name || "Loading site…"}</small>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">
            <span>Operations</span>
            <em>/</em>
            <strong>Plant twin</strong>
          </div>

          <div className="top-actions">
            <label className="field">
              <span>Scenario</span>
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
            <button type="button" className="btn-run" onClick={onPlay} disabled={status === "running"}>
              {status === "running" ? "Streaming" : "Run scenario"}
            </button>
            {status === "running" && (
              <>
                <button type="button" className="btn-quiet" onClick={onPauseToggle}>
                  {paused ? "Resume" : "Pause"}
                </button>
                <button type="button" className="btn-quiet" onClick={onSkipAhead} disabled={paused}>
                  Skip ahead
                </button>
              </>
            )}
          </div>

          <div className="clock">
            <span>T+</span>
            <b>{tSec}s</b>
          </div>
        </header>

        <section className="kpis">
          <article>
            <small>Fusion critical</small>
            <b>{fmt(metrics?.fusion_first_critical_sec ?? critical?.t_sec)}</b>
            <em>{critical ? "compound path" : "awaiting run"}</em>
          </article>
          <article>
            <small>Baseline fire</small>
            <b>{fmt(metrics?.baseline_first_fire_sec ?? baselineFire?.t_sec)}</b>
            <em>{baselineFire || metrics?.baseline_first_fire_sec != null ? "single-sensor" : "still silent"}</em>
          </article>
          <article className="accent">
            <small>Lead time</small>
            <b>{lead != null ? `+${lead}s` : "—"}</b>
            <em>fusion advantage</em>
          </article>
          <article>
            <small>Active PTW</small>
            <b>{livePermits.length}</b>
            <em>{livePermits[0] ? permitLabel(livePermits[0]) : "none live"}</em>
          </article>
        </section>

        <section className="stage">
          <div className="twin-frame">
            <div className="twin-aura" aria-hidden />
            {plant ? (
              <PlantScene3D
                plant={plant}
                zonesTint={zonesTint}
                criticalZoneId={critical?.zone_id}
                gasZoneIds={critical?.gas_zone_ids || []}
              />
            ) : (
              <div className="loading">Building twin…</div>
            )}

            <div className="overlay-top">
              {livePermits.map((p) => (
                <span key={p.id} className={`chip ptw ${p.permit_type || ""}`}>
                  {permitLabel(p)}
                </span>
              ))}
            </div>

            {critical && (
              <div className="hot-card">
                <span>Hot zone</span>
                <strong>{zoneTitle(critical.zone_id)}</strong>
                <em>{critical.severity}</em>
              </div>
            )}

            {(critical || baselineFire) && (
              <div className="race-card">
                <div className={`lane ${critical ? "on" : ""}`}>
                  <span>Fusion</span>
                  <b>{critical ? `CRITICAL @${critical.t_sec}s` : "watching"}</b>
                </div>
                <div className={`lane base ${baselineFire ? "on" : ""}`}>
                  <span>Baseline</span>
                  <b>
                    {baselineFire
                      ? `fire @${baselineFire.t_sec}s`
                      : critical
                        ? "still silent"
                        : "watching"}
                  </b>
                </div>
                {lead != null && critical && baselineFire && (
                  <p>Fusion led by {lead}s</p>
                )}
              </div>
            )}

            <div className="legend">
              <span><i className="ok" /> Clear</span>
              <span><i className="warn" /> Elevated</span>
              <span><i className="crit" /> Critical</span>
            </div>
          </div>

          <aside className={`ops ${nav}`}>
            <header className="ops-head">
              <div>
                <h1>
                  {nav === "knowledge" ? "HSE knowledge" : nav === "audit" ? "Decision audit" : "Assessment"}
                </h1>
                <p>
                  {nav === "knowledge"
                    ? "Curated industrial guidance"
                    : nav === "audit"
                      ? "Executed actions this session"
                      : "Compound risk vs single-sensor baseline"}
                </p>
              </div>
            </header>

            {(nav === "twin" || nav === "risk") && (
              <div className="ops-body">
                {metrics && (
                  <p className="proof">
                    Fusion <b>{fmt(metrics.fusion_first_critical_sec)}</b>
                    {" · "}
                    baseline{" "}
                    {metrics.baseline_first_fire_sec == null
                      ? "missed"
                      : fmt(metrics.baseline_first_fire_sec)}
                    {" · "}
                    <span>+{metrics.lead_time_sec ?? "—"}s lead</span>
                  </p>
                )}

                {assessments.length === 0 && !decision && (
                  <p className="empty">
                    Run a scenario. The twin lights zones and agents; decide from here.
                  </p>
                )}

                {assessments.map((a) => {
                  const cite = a.citations?.[0];
                  return (
                    <article key={a.id || a.title} className={`ticket ${a.severity}`}>
                      <div className="ticket-top">
                        <h2>{a.title}</h2>
                        <span>
                          {a.model_score != null ? `${(a.model_score * 100).toFixed(0)}%` : "—"}
                        </span>
                      </div>
                      {a.agents?.length > 0 && (
                        <div className="agents">
                          {a.agents.map((ag) => (
                            <span
                              key={ag.agent}
                              className={ag.facts?.length ? "lit" : ""}
                              title={(ag.facts || []).map((f) => f.label).join(" · ") || "quiet"}
                            >
                              {ag.agent}
                            </span>
                          ))}
                        </div>
                      )}
                      {a.ai?.summary && (
                        <p className="brief">
                          <span>{a.ai.provider}</span>
                          {a.ai.summary}
                        </p>
                      )}
                      <ul>
                        {a.factors?.slice(0, 3).map((f) => (
                          <li key={f.code}>{f.label}</li>
                        ))}
                      </ul>
                      {a.related_permit_ids?.length > 0 && (
                        <p className="meta">PTW {a.related_permit_ids.join(", ")}</p>
                      )}
                      {cite && (
                        <div className="evidence">
                          <p className="src">{cite.source}</p>
                          {cite.excerpt && <p>{cite.excerpt}</p>}
                          {cite.next_step && (
                            <p className="now">
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
                          {decision?.assessment_id === a.id
                            ? "Executed"
                            : actionLabel(a.recommended_action)}
                        </button>
                      )}
                    </article>
                  );
                })}

                {decision && (
                  <article className="ticket ok">
                    <div className="ticket-top">
                      <h2>{decision.message}</h2>
                      <span>OK</span>
                    </div>
                  </article>
                )}
              </div>
            )}

            {nav === "knowledge" && (
              <div className="ops-body">
                <form onSubmit={onAsk} className="ask">
                  <input
                    value={ask}
                    onChange={(e) => setAsk(e.target.value)}
                    placeholder="Ask about hot work, gas, confined space…"
                  />
                  <button type="submit" disabled={asking || !ask.trim()}>
                    {asking ? "…" : "Ask"}
                  </button>
                </form>
                {knowledge && (
                  <div className="ask-out">
                    <p>{knowledge.answer}</p>
                    {knowledge.citations?.[0] && (
                      <small>{knowledge.citations[0].source}</small>
                    )}
                  </div>
                )}
              </div>
            )}

            {nav === "audit" && (
              <div className="ops-body">
                {audit.length === 0 ? (
                  <p className="empty">No decisions yet — block or escalate from Risk.</p>
                ) : (
                  <ul className="audit-list">
                    {audit.slice(0, 8).map((d) => (
                      <li key={d.id}>
                        <span>{d.action}</span>
                        <p>{d.message}</p>
                        <time>{(d.ts || "").replace("T", " ").slice(0, 19)}</time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {error && <p className="error">{error}</p>}
          </aside>
        </section>
      </main>
    </div>
  );
}
