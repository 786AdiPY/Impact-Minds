import { buildCBOM, buildUnusedPrivilege, buildAccountInventory, buildRotationExceptions } from '../lib/store.js';
import Topbar from './Topbar.jsx';

const BUCKET_COLOR = {
  'ML-KEM (FIPS 203)': '#37e0a6',
  'NTRU Prime (non-NIST)': '#ffd23f',
  'CLASSICAL': '#ff7a1a',
};

function CBOMCard() {
  const c = buildCBOM();
  const tiers = [4, 3, 2, 1];
  return (
    <div className="card">
      <div className="card-h">
        <h3>CBOM — cryptographic bill of materials</h3>
        <span className="sub">negotiated KEX, not installed version · §8.5</span>
      </div>
      <div style={{ padding: '18px' }}>
        <div className="cbom-stats">
          <div className="cbom-stat">
            <div className="cbom-stat-v" style={{ color: 'var(--emerald)' }}>{c.pqReadiness}%</div>
            <div className="cbom-stat-k">fleet-wide PQ readiness</div>
          </div>
          <div className="cbom-stat">
            <div className="cbom-stat-v" style={{ color: c.t4ClassicalHosts > 0 ? 'var(--crit)' : 'var(--emerald)' }}>{c.t4Readiness}%</div>
            <div className="cbom-stat-k">T4 (crown jewel) readiness</div>
          </div>
          <div className="cbom-stat">
            <div className="cbom-stat-v" style={{ color: c.t4ClassicalHosts > 0 ? 'var(--crit)' : 'var(--emerald)' }}>{c.t4ClassicalHosts}</div>
            <div className="cbom-stat-k">T4 hosts still classical → R041</div>
          </div>
          <div className="cbom-stat">
            <div className="cbom-stat-v">{c.totalHosts.toLocaleString()}</div>
            <div className="cbom-stat-k">hosts observed, 90d</div>
          </div>
        </div>

        <div className="cbom-legend">
          {Object.entries(BUCKET_COLOR).map(([b, col]) => (
            <span key={b} className="cbom-legend-item"><i style={{ background: col }} />{b}</span>
          ))}
        </div>

        {tiers.map((tier) => {
          const rows = c.rows.filter((r) => r.tier === tier);
          const tierTotal = rows.reduce((s, r) => s + r.hosts, 0);
          return (
            <div className="cbom-tier-row" key={tier}>
              <div className="cbom-tier-lbl"><span className={`tier tier-${tier}`}>T{tier}</span> {tierTotal.toLocaleString()} hosts</div>
              <div className="cbom-bar">
                {rows.map((r) => (
                  <div key={r.bucket} className="cbom-seg" style={{ width: `${(r.hosts / tierTotal) * 100}%`, background: BUCKET_COLOR[r.bucket] }}
                    title={`${r.bucket}: ${r.hosts} hosts, ${r.sessions_90d.toLocaleString()} sessions/90d (${r.kex})`} />
                ))}
              </div>
            </div>
          );
        })}
        <p className="mut" style={{ fontSize: 11.5, marginTop: 14, lineHeight: 1.6 }}>
          Three buckets, not two — NTRU Prime is post-quantum but not NIST-standardised (OpenSSH shipped it in 9.0,
          before FIPS 203 existed). RBI's Q-SAFE Committee has CBOM creation as its stated key task; this falls out
          for free from sitting on every privileged connection.
        </p>
      </div>
    </div>
  );
}

function UnusedPrivilegeCard() {
  const u = buildUnusedPrivilege();
  return (
    <div className="card">
      <div className="card-h">
        <h3>Unused standing privilege</h3>
        <span className="sub">auto-revoke, 7-day notice · §H3</span>
      </div>
      <div style={{ padding: 18 }}>
        <div className="big-number">
          <div className="big-number-v">{u.pct}%</div>
          <div className="big-number-k">of {u.standing_total.toLocaleString()} standing entitlements never exercised in 90 days</div>
        </div>
        <p className="mut" style={{ fontSize: 12, margin: '10px 0 16px', lineHeight: 1.6 }}>
          We're not detecting the insider threat here — we're deleting most of it, before a single model runs.
        </p>
        <table className="mini-table">
          <thead><tr><th>Identity</th><th>Account</th><th>Kind</th><th>Last used</th></tr></thead>
          <tbody>
            {u.sample.map((e, i) => (
              <tr key={i}>
                <td>{e.identity}</td>
                <td className="mono">{e.account}</td>
                <td><span className={e.grant_kind === 'STANDING' ? 'tag-pill tag-vendor' : 'tag-pill tag-emp'} style={e.grant_kind === 'STANDING' && e.last_used_days <= 90 ? { background: 'rgba(55,224,166,.12)', color: 'var(--emerald)' } : {}}>{e.grant_kind}</span></td>
                <td className={e.last_used_days > 90 ? 'flag-bad' : 'flag-ok'}>{e.last_used_days}d ago{e.last_used_days > 90 ? ' · revoke' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountInventoryCard() {
  const a = buildAccountInventory();
  return (
    <div className="card">
      <div className="card-h"><h3>Privileged account inventory</h3><span className="sub">discovery vs CMDB · §H4</span></div>
      <div style={{ padding: 18 }}>
        <div className="cbom-stats">
          <div className="cbom-stat"><div className="cbom-stat-v">{a.cmdb_estimate}</div><div className="cbom-stat-k">CMDB estimate</div></div>
          <div className="cbom-stat"><div className="cbom-stat-v" style={{ color: 'var(--high)' }}>{a.discovered}</div><div className="cbom-stat-k">actually discovered ({a.discoveryRatio}×)</div></div>
          <div className="cbom-stat"><div className="cbom-stat-v" style={{ color: 'var(--crit)' }}>{a.exposure}</div><div className="cbom-stat-k">not yet onboarded — your exposure</div></div>
        </div>
        <p className="mut" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>Discovery typically finds 2–3× the CMDB estimate. That gap is a slide on its own.</p>
      </div>
    </div>
  );
}

function RotationCard() {
  const rows = buildRotationExceptions();
  return (
    <div className="card">
      <div className="card-h"><h3>Rotation exception register</h3><span className="sub">CISO-signed, mandatory expiry · §H5</span></div>
      <table className="mini-table" style={{ padding: '0 4px' }}>
        <thead><tr><th>Account</th><th>Asset</th><th>Reason</th><th>Expires</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="mono">{r.account}</td>
              <td className="mono">{r.asset}</td>
              <td className="mut" style={{ fontSize: 11.5 }}>{r.reason}</td>
              <td>{r.expires}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mut" style={{ fontSize: 11.5, padding: '12px 18px', lineHeight: 1.6 }}>
        Every exemption carries a +18 point standing risk contribution and a mandatory expiry — making the exception
        expensive and visible is the only thing that shrinks this list.
      </p>
    </div>
  );
}

export default function Reports() {
  return (
    <div>
      <Topbar exportName="glint-reports.csv" exportData={() => ({
        cbom: buildCBOM(), unusedPrivilege: buildUnusedPrivilege(),
        accountInventory: buildAccountInventory(), rotationExceptions: buildRotationExceptions(),
      })} exportLabel="Export Reports" />
      <div className="head">
        <div>
          <h2>Compliance reports</h2>
          <p>Auditors don't want your architecture. They want evidence, on a schedule, with no engineer in the loop.</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <CBOMCard />
        <div className="dash-grid" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
          <UnusedPrivilegeCard />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <AccountInventoryCard />
          </div>
        </div>
        <RotationCard />
      </div>
    </div>
  );
}
