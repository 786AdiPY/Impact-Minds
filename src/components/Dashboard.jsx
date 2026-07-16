import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildQueue, collusionFindings, BAND_COLOR } from '../lib/store.js';
import Topbar from './Topbar.jsx';

const BAND_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const INSIGHTS = [
  { h: 'Peer deviation caught Divya’s slow-ramp export — her own baseline never would have.', ref: '§6.3.3 · PT-01' },
  { h: 'S. Iyer approved 26 of 26 requests from one maker, under a minute each.', ref: '§6.6 · rubber-stamp' },
  { h: 'Every risk point traces to a source event — attribution error holds at ~1e-6.', ref: '§6.5 · exact attribution' },
  { h: 'The queue stays fixed at top-N. A bad day never floods the analyst.', ref: '§13.1 · alert budget' },
];

function Donut({ rows }) {
  const total = rows.length || 1;
  const counts = BAND_ORDER.map((b) => rows.filter((r) => r.fused.band === b).length);
  let acc = 0;
  const stops = BAND_ORDER.map((b, i) => {
    const pct = (counts[i] / total) * 100;
    const from = acc; acc += pct;
    return `${BAND_COLOR[b]} ${from}% ${acc}%`;
  }).join(', ');
  const actionable = counts[0] + counts[1];
  const pct = Math.round((actionable / total) * 100);

  return (
    <div className="card">
      <div className="card-h"><h3>Risk Band Breakdown</h3></div>
      <div style={{ padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div className="dash-donut" style={{ background: `conic-gradient(${stops})` }}>
          <div className="dash-donut-inner">
            <div className="dash-donut-pct">{pct}%</div>
            <div className="dash-donut-lbl">need review</div>
          </div>
        </div>
        <div style={{ width: '100%' }}>
          {BAND_ORDER.map((b, i) => (
            <div className="legend-row" key={b}>
              <span className="legend-dot" style={{ background: BAND_COLOR[b] }} />
              <span className="legend-name">{b}</span>
              <span className="legend-val">{counts[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssetBars({ rows }) {
  const byAsset = {};
  for (const r of rows) {
    const k = r.asset.hostname;
    if (!byAsset[k] || r.fused.score > byAsset[k].score) byAsset[k] = { score: r.fused.score, tier: r.asset.tier, band: r.fused.band };
  }
  const list = Object.entries(byAsset).sort((a, b) => b[1].score - a[1].score).slice(0, 5);
  return (
    <div className="card">
      <div className="card-h"><h3>Top Targeted Assets</h3></div>
      <div style={{ padding: '14px 18px' }}>
        {list.map(([host, v]) => (
          <div className="asset-bar-row" key={host}>
            <div className="asset-bar-top">
              <span className="mono">{host}</span>
              <span className={`tier tier-${v.tier}`}>T{v.tier}</span>
              <span className="asset-bar-val" style={{ color: BAND_COLOR[v.band] }}>{v.score}</span>
            </div>
            <div className="dbar"><i style={{ width: `${v.score}%`, background: BAND_COLOR[v.band] }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ rows }) {
  const bars = rows.slice(0, 6);
  const ticks = [100, 75, 50, 25, 0];
  return (
    <div className="card">
      <div className="card-h"><h3>Session risk by identity</h3></div>
      <div className="trend-wrap">
        <div className="trend-ticks">{ticks.map((t) => <span key={t}>{t}</span>)}</div>
        <div className="trend-bars">
          {bars.map((r) => (
            <div className="trend-col" key={r.key}>
              <div className="trend-bar" style={{ height: `${r.fused.score}%`, background: BAND_COLOR[r.fused.band] }} title={`${r.identity.display_name}: ${r.fused.score}`} />
              <div className="trend-xlbl">{r.identity.display_name.split(' ').map((w) => w[0]).join('')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Insights() {
  const [i, setI] = useState(0);
  const next = () => setI((v) => (v + 1) % INSIGHTS.length);
  const cur = INSIGHTS[i];
  return (
    <div className="insights-panel">
      <div className="insights-tag">Detection Insights</div>
      <div className="insights-dots">
        {INSIGHTS.map((_, k) => <span key={k} className={`idot ${k === i ? 'on' : ''}`} onClick={() => setI(k)} />)}
      </div>
      <div className="insights-h">{cur.h}</div>
      <div className="insights-ref">{cur.ref}</div>
      <button className="insights-arrow" onClick={next} aria-label="next insight">↗</button>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const rows = buildQueue();
  const findings = collusionFindings();
  const critCount = rows.filter((r) => r.fused.band === 'CRITICAL').length;

  return (
    <div>
      <Topbar exportName="glint-dashboard.csv" exportData={() => ({ rows: rows.map((r) => ({ identity: r.identity.display_name, asset: r.asset.hostname, score: r.fused.score, band: r.fused.band, decision: r.decision })), findings })} />

      <div className="head">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of privileged sessions across the estate — ranked, attributed, and enforced.</p>
        </div>
        <div className="kpis">
          <div className="kpi"><div className="v" style={{ color: 'var(--crit)' }}>{critCount}</div><div className="k">Critical</div></div>
          <div className="kpi"><div className="v">{rows.length}</div><div className="k">Sessions</div></div>
        </div>
      </div>

      <div className="dash-grid">
        <Donut rows={rows} />
        <AssetBars rows={rows} />
        <TrendChart rows={rows} />
      </div>

      <div style={{ marginTop: 18 }}>
        <Insights />
      </div>

      <div style={{ marginTop: 18 }}>
        <button className="btn btn-g" onClick={() => navigate('/queue')}>View full threat queue →</button>
      </div>
    </div>
  );
}
