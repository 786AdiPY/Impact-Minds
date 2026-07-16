import { collusionFindings } from '../lib/store.js';
import Topbar from './Topbar.jsx';

export default function Findings() {
  const rows = collusionFindings();
  return (
    <div>
      <Topbar exportName="glint-findings.csv" exportData={() => rows} exportLabel="Export Findings" />
      <div className="head">
        <div>
          <h2>Governance findings</h2>
          <p>Relational checks that a per-session view can never surface. Costs one SQL query — no ML, no graph engine (§6.6).</p>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Maker-checker integrity — rubber-stamp detection</h3>
          <span className="sub">approvers who never deny one specific requester, in seconds</span>
        </div>
        <div className="findrow" style={{ color: 'var(--text-mut)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1 }}>
          <div>Approver → Requester</div><div>Pattern</div><div>Approvals</div><div>Avg decision</div><div>Verdict</div>
        </div>
        {rows.map((r, i) => (
          <div className="findrow" key={i}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.approver}</div>
              <div className="mut" style={{ fontSize: 11.5 }}>→ {r.requester}</div>
            </div>
            <div className="mut" style={{ fontSize: 12 }}>{r.denials} denials / {r.n}</div>
            <div className="mono" style={{ fontWeight: 700 }}>{r.n}</div>
            <div className="mono" style={{ color: r.avgLatency < 60 ? 'var(--crit)' : 'var(--emerald)' }}>{r.avgLatency.toFixed(0)}s</div>
            <div>
              {r.rubberStamp
                ? <span className="flag-bad">⚠ NOT A CONTROL</span>
                : <span className="flag-ok">✓ deliberated</span>}
            </div>
          </div>
        ))}
        <div className="finding-note">
          <b style={{ color: 'var(--crit)' }}>S. Iyer</b> approved <b>26 of 26</b> of Vikram Desai's T3 access requests, zero denials,
          median decision latency under a minute. That is not review — that is a reflex, and it defeats the maker-checker control
          that RBI mandates. The pair is individually within policy and only visible <i>relationally</i>.
        </div>
      </div>
    </div>
  );
}
