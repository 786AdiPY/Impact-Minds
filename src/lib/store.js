// Client-side store: scores the seeded world with the real engine and exposes
// helpers for the live streaming demo. No network dependency — the detection
// brain runs in the browser, so the stage demo can't be broken by wifi.

import {
  IDENTITIES, ASSETS, BASELINES, SCENARIOS, buildApprovals,
  CBOM_INVENTORY, ENTITLEMENT_FLEET, ENTITLEMENTS_SAMPLE, ACCOUNT_INVENTORY, ROTATION_EXEMPTIONS,
} from './data.js';
import { scoreSession } from './engine.js';

export const byExt = Object.fromEntries(IDENTITIES.map((i) => [i.external_id, i]));
export const byHost = Object.fromEntries(ASSETS.map((a) => [a.hostname, a]));

const BAND_RANK = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };

// Score one scenario at a given event-count (for streaming, pass a slice).
export function scoreScenario(key, upToEvent = Infinity) {
  const s = SCENARIOS[key];
  const identity = byExt[s.identity];
  const asset = byHost[s.asset];
  const events = s.events.slice(0, upToEvent);
  const result = scoreSession({
    identity, asset, events, baselines: BASELINES,
    from_broker: s.session.from_broker, pq_kex: s.session.pq_kex,
  });
  return { key, scenario: s, identity, asset, events, ...result };
}

// Build the full seeded queue (every scenario at its final state).
export function buildQueue() {
  const rows = Object.keys(SCENARIOS).map((k) => scoreScenario(k));
  return rows.sort((a, b) => {
    const r = (BAND_RANK[b.fused.band] - BAND_RANK[a.fused.band]);
    return r !== 0 ? r : b.fused.score - a.fused.score;
  });
}

// §6.6 rubber-stamp / collusion finding — computed over the approvals set.
export function collusionFindings() {
  const approvals = buildApprovals('2026-07-16T09:00:00Z');
  const groups = {};
  for (const a of approvals) {
    const k = `${a.approver}|${a.requester}`;
    (groups[k] ||= { approver: a.approver, requester: a.requester, n: 0, denials: 0, latencies: [] });
    groups[k].n++;
    if (a.decision === 'DENY') groups[k].denials++;
    groups[k].latencies.push((new Date(a.decided_at) - new Date(a.requested_at)) / 1000);
  }
  return Object.values(groups).map((g) => {
    const avg = g.latencies.reduce((s, x) => s + x, 0) / g.latencies.length;
    const rubberStamp = g.n >= 20 && g.denials === 0 && avg < 60;
    return { ...g, avgLatency: avg, rubberStamp };
  }).sort((a, b) => (b.rubberStamp - a.rubberStamp) || (b.n - a.n));
}

// ── H1: CBOM / PQ-readiness report ───────────────────────────────────────────
export function buildCBOM() {
  const rows = CBOM_INVENTORY;
  const totalHosts = rows.reduce((s, r) => s + r.hosts, 0);
  const byBucket = {};
  for (const r of rows) (byBucket[r.bucket] ||= { hosts: 0, sessions_90d: 0 }), (byBucket[r.bucket].hosts += r.hosts), (byBucket[r.bucket].sessions_90d += r.sessions_90d);
  const t4 = rows.filter((r) => r.tier === 4);
  const t4Hosts = t4.reduce((s, r) => s + r.hosts, 0);
  const t4Pq = t4.filter((r) => r.bucket !== 'CLASSICAL').reduce((s, r) => s + r.hosts, 0);
  return {
    rows, totalHosts, byBucket,
    pqReadiness: +((rows.filter((r) => r.bucket !== 'CLASSICAL').reduce((s, r) => s + r.hosts, 0) / totalHosts) * 100).toFixed(1),
    t4Readiness: +((t4Pq / t4Hosts) * 100).toFixed(1),
    t4ClassicalHosts: t4Hosts - t4Pq,
  };
}

// ── H3: Unused standing privilege ────────────────────────────────────────────
export function buildUnusedPrivilege() {
  const { standing_total, standing_unused_90d } = ENTITLEMENT_FLEET;
  const pct = Math.round((standing_unused_90d / standing_total) * 100);
  const sample = [...ENTITLEMENTS_SAMPLE].sort((a, b) => b.last_used_days - a.last_used_days);
  return { standing_total, standing_unused_90d, pct, sample };
}

// ── H4: Privileged account inventory ─────────────────────────────────────────
export function buildAccountInventory() {
  const { cmdb_estimate, discovered, onboarded } = ACCOUNT_INVENTORY;
  return { cmdb_estimate, discovered, onboarded, exposure: discovered - onboarded, discoveryRatio: +(discovered / cmdb_estimate).toFixed(1) };
}

// ── H5: Rotation exception register ──────────────────────────────────────────
export function buildRotationExceptions() {
  return ROTATION_EXEMPTIONS;
}

export const BAND_COLOR = {
  CRITICAL: '#ff7a1a', HIGH: '#ff9f43', MEDIUM: '#ffd23f', LOW: '#37e0a6',
};
export const ACTION_COLOR = {
  TERMINATE: '#ff7a1a', FREEZE: '#ff9166', STEP_UP: '#ff9f43', CASE: '#ffd23f', ALLOW: '#37e0a6',
};
