import { useNavigate } from 'react-router-dom';
import { buildQueue, BAND_COLOR, ACTION_COLOR } from '../lib/store.js';
import Topbar from './Topbar.jsx';

function Donut({ score, band }) {
  const c = BAND_COLOR[band];
  return (
    <div className="donut" style={{ '--v': score, '--c': c }}>
      <div className="inner" style={{ color: c }}>{score}</div>
    </div>
  );
}

export default function Queue() {
  const navigate = useNavigate();
  const rows = buildQueue();
  const crit = rows.filter((r) => r.fused.band === 'CRITICAL').length;
  const high = rows.filter((r) => r.fused.band === 'HIGH').length;

  return (
    <div>
      <Topbar exportName="glint-queue.csv" exportData={() => rows.map((r) => ({ identity: r.identity.display_name, asset: r.asset.hostname, score: r.fused.score, band: r.fused.band, decision: r.decision, rules: r.fired.map((f) => f.rule_id) }))} />
      <div className="head">
        <div>
          <h2>Threat queue</h2>
          <p>Fixed top-30 ranked by risk — a bounded queue, not an unbounded threshold (§13.1). Of 22,000 sessions today, these need a human.</p>
        </div>
        <div className="kpis">
          <div className="kpi"><div className="v" style={{ color: 'var(--crit)' }}>{crit}</div><div className="k">Critical</div></div>
          <div className="kpi"><div className="v" style={{ color: 'var(--high)' }}>{high}</div><div className="k">High</div></div>
          <div className="kpi"><div className="v">{rows.length}</div><div className="k">In queue</div></div>
        </div>
      </div>

      <div className="card">
        <div className="qrow head-row">
          <div>#</div><div>Identity</div><div>Target asset</div><div>Top signal</div><div>Risk</div><div>Action</div>
        </div>
        {rows.map((r, i) => {
          const top = [...r.fused.contributions].sort((a, b) => b.logit_delta - a.logit_delta)[0];
          const isVendor = ['VENDOR', 'CONTRACTOR'].includes(r.identity.identity_type);
          return (
            <div className="qrow" key={r.key} onClick={() => navigate(`/queue/${r.key}`)}>
              <div className="rank">{String(i + 1).padStart(2, '0')}</div>
              <div className="who">
                {r.identity.display_name}
                <div className="meta">
                  <span className={isVendor ? 'tag-pill tag-vendor' : 'tag-pill tag-emp'}>{r.identity.identity_type}</span>
                  {' '}{r.identity.role_name}
                  {r.identity.hr_flags.includes('SEPARATION_NOTICE') && <span className="flag-bad"> · resigning</span>}
                </div>
              </div>
              <div className="target">
                <span className="host">{r.asset.hostname}</span>
                <span className={`tier tier-${r.asset.tier}`}>T{r.asset.tier}</span>
                {r.scenario.session.from_broker === false && <div className="flag-bad" style={{ fontSize: 11 }}>off-broker bypass</div>}
              </div>
              <div className="mut" style={{ fontSize: 12 }}>
                {r.fired[0] ? <span style={{ color: 'var(--crit)', fontWeight: 600 }}>{r.fired[0].rule_id}</span> : (top ? top.featureKey : '—')}
                <div style={{ marginTop: 2 }}>{r.fired[0] ? r.fired[0].rule_name : (top ? top.observed : 'nominal')}</div>
              </div>
              <div className="scorebadge">
                <Donut score={r.fused.score} band={r.fused.band} />
                <span className="band-lbl" style={{ color: BAND_COLOR[r.fused.band] }}>{r.fused.band}</span>
              </div>
              <div className="action-chip" style={{ background: `${ACTION_COLOR[r.decision]}1e`, color: ACTION_COLOR[r.decision] }}>
                {r.decision}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
