import { useState } from 'react';
import { SCENARIOS } from '../lib/data.js';
import { scoreScenario, BAND_COLOR, ACTION_COLOR } from '../lib/store.js';

export default function Live() {
  const [pick, setPick] = useState('priya_exfil');
  const result = scoreScenario(pick);
  const { fused, fired, decision, events } = result;
  const color = BAND_COLOR[fused.band];

  return (
    <div>
      <div className="head">
        <div>
          <h2>Live session scoring</h2>
          <p>Select a scenario to see its full transcript, risk score, and the rules that fired.</p>
        </div>
      </div>

      <div className="live-wrap">
        <div className="card">
          <div className="card-h"><h3>Select a scenario</h3><span className="sub">purple-team library</span></div>
          <div className="scenario-pick">
            {Object.entries(SCENARIOS).map(([k, s]) => (
              <button key={k} className={`scenario-btn ${k === pick ? 'on' : ''}`} onClick={() => setPick(k)}>
                <div style={{ fontWeight: 600 }}>{s.label}</div>
                <div className="sd">{s.identity} → {s.asset} · {s.events.length} events</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-h">
              <h3>Score</h3>
              <span className="action-chip" style={{ background: `${ACTION_COLOR[decision]}1e`, color: ACTION_COLOR[decision] }}>{decision}</span>
            </div>
            <div style={{ padding: 18, textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 40, fontWeight: 800, color }}>{fused.score}</div>
              <div style={{ fontWeight: 800, letterSpacing: 2, color, fontSize: 12 }}>{fused.band}</div>
            </div>
            {fired.length > 0 && (
              <div style={{ padding: '0 14px 14px' }}>
                {fired.map((r, i) => (
                  <div className="rulehit" key={i}>
                    <div className="rid">{r.rule_id}</div>
                    <div>
                      <div className="rn">
                        {r.rule_name}
                        {r.precision === 1.0 && <span className="precision-badge">PRECISION 1.0 · NO ML</span>}
                      </div>
                      <div className="mitre">→ {r.auto_action}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-h"><h3>Session transcript</h3><span className="sub">{events.length} events</span></div>
            <div className="evfeed">
              {events.map((e, i) => (
                <div className="evrow" key={i}>
                  <span className="seq">{String(i + 1).padStart(2, '0')}</span>
                  <span className="cmd">{e.cmd_raw}</span>
                  {e.rows_affected > 0 && <span className="rows">{e.rows_affected.toLocaleString()} rows</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
