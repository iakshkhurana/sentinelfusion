import { useEffect, useMemo, useState } from "react";

async function getJson(path, init) {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function zoneFill(zoneId, criticalZoneId, gasZones) {
  if (zoneId === criticalZoneId) return "rgba(255, 90, 79, 0.72)";
  if (gasZones.has(zoneId)) return "rgba(230, 184, 77, 0.55)";
  return "rgba(40, 70, 58, 0.55)";
}

export default function App() {
  const [plant, setPlant] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [scenarioId, setScenarioId] = useState("hot_work_gas_adjacent");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getJson("/api/v1/plant/layout"), getJson("/api/v1/scenarios")])
      .then(([layout, list]) => {
        setPlant(layout);
        setScenarios(list);
        if (list[0]) setScenarioId(list[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  const critical = result?.assessments?.[0] ?? null;
  const gasZones = useMemo(() => {
    // from assessment factors / related zone — coke oven is the gas side of hero scenario
    if (!critical) return new Set();
    return new Set(["zone_coke_oven", critical.zone_id]);
  }, [critical]);

  async function onPlay() {
    setBusy(true);
    setError(null);
    try {
      const out = await getJson(`/api/v1/scenarios/${scenarioId}/run`, { method: "POST" });
      setResult(out);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const m = result?.metrics;

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>SentinelFusion</h1>
          <p>Digital Twin · Demo Mode</p>
        </div>
        <div className="pill">DEMO MODE</div>
      </header>

      <div className="grid">
        <section className="panel">
          <div className="row">
            <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <button className="primary" type="button" onClick={onPlay} disabled={busy}>
              {busy ? "Running…" : "Play scenario"}
            </button>
          </div>

          {m && (
            <div className="meta">
              <span>fusion @ {m.fusion_first_critical_sec ?? "—"}s</span>
              <span>baseline @ {m.baseline_first_fire_sec ?? "—"}s</span>
              <span>lead {m.lead_time_sec ?? "—"}s</span>
              <span>{m.baseline_miss ? "baseline late/miss" : "baseline ok"}</span>
            </div>
          )}
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
                      fill={zoneFill(z.id, critical?.zone_id, gasZones)}
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
          {!result && <p className="muted">Play a scenario to see compound risk.</p>}
          {result?.assessments?.map((a, i) => (
            <article key={`${a.title}-${i}`} className={`card ${a.severity}`}>
              <div className="sev">{a.severity}</div>
              <strong>{a.title}</strong>
              <div className="meta">
                <span>t={a.t_sec}s</span>
                <span>{a.recommended_action?.replaceAll("_", " ")}</span>
                {a.baseline_miss && <span>beats baseline</span>}
              </div>
              <ul>
                {a.factors?.map((f) => (
                  <li key={f.code}>{f.label}</li>
                ))}
              </ul>
            </article>
          ))}
        </aside>
      </div>
    </div>
  );
}
