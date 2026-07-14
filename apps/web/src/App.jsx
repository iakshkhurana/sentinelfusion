import { useEffect, useState, useRef } from "react";
import PlantScene3D from "./PlantScene3D.jsx";
import {
  actionLabel,
  computeLead,
  fmt,
  permitLabel,
  playbookSteps,
  scorePct,
  wsUrl,
  zoneTitle,
} from "./demoLogic.js";
import { onWsClosed, reduceRun, resetRun } from "./runState.js";

async function getJson(path, init) {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function RaceTrack({ fusion, baseline, incident }) {
  const end = Math.max(incident || 1, fusion || 0, baseline || 0, 1);
  const pct = (t) => (t == null ? null : Math.min(100, Math.max(0, (t / end) * 100)));
  const f = pct(fusion);
  const b = pct(baseline);
  const i = pct(incident);
  return (
    <div className="race-track">
      <div className="race-track-bar">
        {f != null && <i className="mark fusion" style={{ left: `${f}%` }} title={`Fusion @${fusion}s`} />}
        {b != null && <i className="mark baseline" style={{ left: `${b}%` }} title={`Baseline @${baseline}s`} />}
        {i != null && <i className="mark incident" style={{ left: `${i}%` }} title={`Incident @${incident}s`} />}
        <span className="race-fill" style={{ width: `${f ?? 0}%` }} />
      </div>
      <div className="race-track-keys">
        <span className="k-f">Fusion {fusion != null ? `@${fusion}s` : "—"}</span>
        <span className="k-b">Baseline {baseline != null ? `@${baseline}s` : "silent"}</span>
        <span className="k-i">Incident {incident != null ? `@${incident}s` : "—"}</span>
      </div>
    </div>
  );
}

function ScrubRail({
  duration,
  tSec,
  fusion,
  baseline,
  incident,
  active,
  onScrub,
}) {
  const dur = Math.max(duration || 1, 1);
  const pct = (t) => (t == null ? null : Math.min(100, Math.max(0, (t / dur) * 100)));
  return (
    <div className={`scrub-rail ${active ? "live" : ""}`}>
      <div className="scrub-meta">
        <span>Timeline</span>
        <b>
          T+{tSec}s / {dur}s
        </b>
      </div>
      <div className="scrub-track">
        <input
          type="range"
          min={0}
          max={dur}
          step={10}
          value={Math.min(tSec, dur)}
          disabled={!active}
          aria-label="Scrub scenario time"
          onChange={(e) => onScrub(Number(e.target.value))}
        />
        <div className="scrub-marks" aria-hidden>
          {pct(fusion) != null && <i className="m-f" style={{ left: `${pct(fusion)}%` }} />}
          {pct(baseline) != null && <i className="m-b" style={{ left: `${pct(baseline)}%` }} />}
          {pct(incident) != null && <i className="m-i" style={{ left: `${pct(incident)}%` }} />}
        </div>
      </div>
      <div className="scrub-keys">
        <span className="k-f">F {fusion != null ? `@${fusion}` : "—"}</span>
        <span className="k-b">B {baseline != null ? `@${baseline}` : "—"}</span>
        <span className="k-i">I {incident != null ? `@${incident}` : "—"}</span>
      </div>
    </div>
  );
}

function AssessmentCard({ a, metrics, deciding, decision, onDecide }) {
  const cite = a.citations?.[0];
  const pct = scorePct(a);
  const done = decision?.assessment_id === a.id;
  return (
    <article className={`ticket ${a.severity}`}>
      <div className="ticket-banner">
        <div>
          <span className="sev">{a.severity}</span>
          <h2>{a.title}</h2>
          <p className="where">
            {zoneTitle(a.zone_id)} · T+{a.t_sec}s
            {a.rule_forced ? " · rule lock" : " · model elevated"}
          </p>
        </div>
        <div className="gauge" aria-label={`Score ${pct ?? "n/a"}`}>
          <b>{pct != null ? `${pct}` : "—"}</b>
          <small>%</small>
        </div>
      </div>

      <RaceTrack
        fusion={a.t_sec ?? metrics?.fusion_first_critical_sec}
        baseline={metrics?.baseline_first_fire_sec}
        incident={metrics?.incident_at_sec}
      />

      <div className="agent-grid">
        {(a.agents || []).map((ag) => (
          <div key={ag.agent} className={`agent-cell ${ag.facts?.length ? "lit" : ""}`}>
            <strong>{ag.agent}</strong>
            <span>{ag.facts?.length ? `${ag.facts.length} fact${ag.facts.length > 1 ? "s" : ""}` : "quiet"}</span>
            {ag.facts?.[0] && <em>{ag.facts[0].label}</em>}
          </div>
        ))}
      </div>

      {a.ai?.summary && (
        <p className="brief">
          <span>{a.ai.provider}</span>
          {a.ai.summary}
        </p>
      )}

      <div className="factor-block">
        <h3>Why this fired</h3>
        <ol>
          {(a.factors || []).slice(0, 4).map((f, i) => (
            <li key={f.code}>
              <span>{i + 1}</span>
              {f.label}
            </li>
          ))}
        </ol>
      </div>

      {a.related_permit_ids?.length > 0 && (
        <div className="ptw-block">
          <h3>Related permits</h3>
          <div className="ptw-ids">
            {a.related_permit_ids.map((id) => (
              <code key={id}>{id}</code>
            ))}
          </div>
        </div>
      )}

      <div className="playbook">
        <h3>Emergency playbook</h3>
        <ol>
          {playbookSteps(a.recommended_action).map(([verb, detail]) => (
            <li key={verb}>
              <strong>{verb}</strong>
              <span>{detail}</span>
            </li>
          ))}
        </ol>
      </div>

      {cite && (
        <div className="evidence">
          <div className="evidence-head">
            <h3>Evidence pack</h3>
            <span>{cite.section || "guidance"}</span>
          </div>
          <p className="src">{cite.source}</p>
          {cite.excerpt && <p className="excerpt">{cite.excerpt}</p>}
          {cite.next_step && (
            <p className="now">
              <span>Now</span> {cite.next_step}
            </p>
          )}
        </div>
      )}

      {a.id && (
        <div className="ticket-act">
          <p>
            Recommended: <b>{actionLabel(a.recommended_action)}</b>
          </p>
          <button
            type="button"
            className="btn-act"
            disabled={deciding || done}
            onClick={() => onDecide(a)}
          >
            {done ? "Executed" : actionLabel(a.recommended_action)}
          </button>
        </div>
      )}
    </article>
  );
}

export default function App() {
  const [plant, setPlant] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [scenarioId, setScenarioId] = useState("hot_work_gas_adjacent");
  const [run, setRun] = useState(() => resetRun("idle"));
  const [decision, setDecision] = useState(null);
  const [audit, setAudit] = useState([]);
  const [ask, setAsk] = useState("hot work near gas");
  const [knowledge, setKnowledge] = useState(null);
  const [asking, setAsking] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState(null);
  const [nav, setNav] = useState("twin");
  const wsRef = useRef(null);

  const {
    assessments,
    metrics,
    zonesTint,
    permits,
    baselineFire,
    tSec,
    status,
    paused,
  } = run;

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
  const lead = computeLead(critical, baselineFire, metrics);
  const activeScenario = scenarios.find((s) => s.id === scenarioId);
  const durationSec = activeScenario?.duration_sec ?? 600;

  function onPlay() {
    setError(null);
    setDecision(null);
    setRun(resetRun("running"));
    setNav("twin");
    wsRef.current?.close();

    const ws = new WebSocket(wsUrl(scenarioId));
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      setRun((s) => reduceRun(s, msg));
    };
    ws.onerror = () => {
      setError("API unreachable — start uvicorn on :8000");
      setRun((s) => ({ ...s, status: "error" }));
    };
    ws.onclose = () => {
      setRun((s) => onWsClosed(s));
    };
  }

  function onPauseToggle() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "control", command: paused ? "resume" : "pause" }));
  }

  function scrubTo(atSec) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "control",
        command: "scrub",
        at_sec: Math.max(0, Number(atSec) || 0),
      }),
    );
  }

  function onSkipAhead() {
    const sc = scenarios.find((s) => s.id === scenarioId);
    const incident = sc?.incident_at_sec ?? 480;
    scrubTo(Math.max(0, incident - 200));
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
            <small>{metrics ? "Baseline miss" : "Active PTW"}</small>
            <b>
              {metrics
                ? metrics.false_negative_baseline
                  ? "FN"
                  : "caught"
                : livePermits.length}
            </b>
            <em>
              {metrics
                ? metrics.false_negative_fusion
                  ? "fusion miss"
                  : "fusion catch"
                : livePermits[0]
                  ? permitLabel(livePermits[0])
                  : "none live"}
            </em>
          </article>
        </section>

        <section className="stage">
          <div className="twin-col">
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
              <div className="hot-card corner">
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

          <ScrubRail
            duration={durationSec}
            tSec={tSec}
            fusion={metrics?.fusion_first_critical_sec ?? critical?.t_sec}
            baseline={metrics?.baseline_first_fire_sec ?? baselineFire?.t_sec}
            incident={metrics?.incident_at_sec ?? activeScenario?.incident_at_sec}
            active={status === "running"}
            onScrub={scrubTo}
          />
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
                  <div className="proof-board">
                    <div>
                      <small>Fusion</small>
                      <b>{fmt(metrics.fusion_first_critical_sec)}</b>
                    </div>
                    <div>
                      <small>Baseline</small>
                      <b>
                        {metrics.baseline_first_fire_sec == null
                          ? "miss"
                          : fmt(metrics.baseline_first_fire_sec)}
                      </b>
                    </div>
                    <div className="hi">
                      <small>Lead</small>
                      <b>+{metrics.lead_time_sec ?? "—"}s</b>
                    </div>
                  </div>
                )}

                {assessments.length === 0 && !decision && (
                  <div className="empty-card">
                    <h3>No active compound risk</h3>
                    <ol>
                      <li>Pick a scenario in the top bar</li>
                      <li>
                        Hit <b>Run scenario</b> (or Skip ahead)
                      </li>
                      <li>Watch agents light the twin, then decide here</li>
                    </ol>
                  </div>
                )}

                {assessments.map((a) => (
                  <AssessmentCard
                    key={a.id || a.title}
                    a={a}
                    metrics={metrics}
                    deciding={deciding}
                    decision={decision}
                    onDecide={onDecide}
                  />
                ))}

                {decision && (
                  <article className="ticket ok done-card">
                    <div className="ticket-banner">
                      <div>
                        <span className="sev ok">done</span>
                        <h2>{decision.message}</h2>
                        {decision.blocked_permit_ids?.length > 0 && (
                          <p className="where">
                            Blocked {decision.blocked_permit_ids.join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="gauge ok">
                        <b>✓</b>
                      </div>
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
