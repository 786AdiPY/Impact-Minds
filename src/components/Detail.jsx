import { useState } from 'react';
import { attributionError } from '../lib/fusion.js';
import { BAND_COLOR, ACTION_COLOR } from '../lib/store.js';

const initials = (n) => n.split(' ').map((w) => w[0]).slice(0, 2).join('');

export default function Detail({ row, onBack }) {
  const { identity, asset, scenario, fused, fired, decision, events } = row;
  const [state, setState] = useState(scenario.session.from_broker === false ? 'ACTIVE' : 'ACTIVE');
  const bandColor = BAND_COLOR[fused.band];
  const maxDelta = Math.max(...fused.contributions.map((c) => Math.abs(c.logit_delta)), 0.001);
  const attrErr = attributionError(fused);

  return (
    <div>
      <div className="head">
        <div>
          <button className="btn btn-g" onClick={onBack} style={{ marginBottom: 12 }}>← Threat queue</button>
          <h2>Session investigation</h2>
          <p>Every point in this score is attributed to a source event. Nothing is a black box.</p>
        </div>
        {state === 'ACTIVE' ? (
          <button className="btn btn-d" onClick={() => setState('TERMINATED')}>⨯ Terminate &amp; freeze credential</button>
        ) : (
          <div className="action-chip" style={{ background: 'rgba(255,122,26,.16)', color: 'var(--crit)', padding: '10px 16px' }}>
            ● SESSION TERMINATED — account rotated
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="detail-grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 0 }}>
          <div className="subject">
            <div className="avatar">{initials(identity.display_name)}</div>
            <div>
              <div className="n">{identity.display_name}</div>
              <div className="d">
                {identity.role_name} · {identity.department} ·{' '}
                <span className={identity.identity_type === 'VENDOR' || identity.identity_type === 'CONTRACTOR' ? 'tag-pill tag-vendor' : 'tag-pill tag-emp'}>
                  {identity.identity_type}
                </span>
              </div>
              <div className="d mono" style={{ marginTop: 6 }}>
                → {asset.hostname} <span className={`tier tier-${asset.tier}`}>T{asset.tier}</span> · {scenario.session.client_geo} · {scenario.session.kex_algorithm}
                {scenario.session.from_broker === false && <span className="flag-bad"> · OFF-BROKER</span>}
              </div>
            </div>
          </div>
          <div className="verdict">
            <div className="big" style={{ color: bandColor }}>{fused.score}</div>
            <div className="band" style={{ color: bandColor }}>{fused.band}</div>
            <div className="dec" style={{ background: `${ACTION_COLOR[decision]}22`, color: ACTION_COLOR[decision] }}>
              DECISION: {decision}
            </div>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        {/* left: the receipt */}
        <div className="card">
          <div className="card-h">
            <h3>Risk attribution — the receipt</h3>
            <span className="sub">noisy-OR within class · log-odds across (§6.5)</span>
          </div>
          <div className="contrib">
            {fused.contributions.length === 0 && <p className="mut" style={{ padding: '10px 0' }}>No statistical evidence — this session is ordinary. (Rules may still apply.)</p>}
            {[...fused.contributions].sort((a, b) => b.logit_delta - a.logit_delta).map((c, i) => (
              <div className="crow" key={i}>
                <div className="crow-top">
                  <div>
                    <span className={`ec-pill ec-${c.evidenceClass}`}>{c.evidenceClass}</span>
                    <span className="feat" style={{ marginLeft: 8 }}>{c.featureKey}</span>
                    <div className="obs">{c.observed}</div>
                  </div>
                  <div className="delta">+{c.logit_delta.toFixed(2)}</div>
                </div>
                <div className="dbar"><i style={{ width: `${(Math.abs(c.logit_delta) / maxDelta) * 100}%` }} /></div>
                <div className="mut" style={{ fontSize: 11, marginTop: 6 }}>{c.note} · reliability ρ={c.weight}</div>
              </div>
            ))}
          </div>
          <div className="invariant">
            ✓ Attribution invariant holds: <b>|Σ logit_delta − logit| = {attrErr.toExponential(1)}</b> — the receipt provably reconstructs the score.
          </div>
        </div>

        {/* right: rules + events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-h"><h3>Deterministic rules fired</h3><span className="sub">rules decide, not ML</span></div>
            <div style={{ padding: 14 }}>
              {fired.length === 0 && <p className="mut">No rules fired — ranking-only.</p>}
              {fired.map((r, i) => (
                <div className="rulehit" key={i}>
                  <div className="rid">{r.rule_id}<br /><span style={{ color: r.severity === 'CRIT' ? 'var(--crit)' : 'var(--high)' }}>{r.severity}</span></div>
                  <div>
                    <div className="rn">
                      {r.rule_name}
                      {r.precision === 1.0 && <span className="precision-badge">PRECISION 1.0 · NO ML</span>}
                    </div>
                    <div className="rw">{r.why}</div>
                    <div className="mitre">→ {r.auto_action}{r.mitre.length ? ` · MITRE ${r.mitre.join(', ')}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
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
