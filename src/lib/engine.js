// Orchestration: accumulate a session's events into (a) a rule context and
// (b) bounded fusion features, then score. Used identically by the seed script
// and the live streaming demo — one brain, two callers.

import { fuse, normalise, applyRuleOverride } from './fusion.js';
import { evaluateRules, decisionFrom } from './rules.js';
import { CANARIES } from './data.js';

// Roll a list of events up into an accumulated context.
export function accumulate(events) {
  const cmd_classes = new Set();
  const tables = new Set();
  const data_classes = new Set();
  let rows_total = 0, bytes_total = 0;
  let in_change_window = false, ticket_verified = false, minHour = null;
  let canaryHit = false, canaryLocator = null;

  for (const e of events) {
    if (e.cmd_class) cmd_classes.add(e.cmd_class);
    (e.tables_touched || []).forEach((t) => tables.add(t));
    (e.data_classes || []).forEach((d) => data_classes.add(d));
    rows_total += Number(e.rows_affected || 0);
    bytes_total += Number(e.bytes_out || 0);
    in_change_window = in_change_window || !!e.in_change_window;
    ticket_verified = ticket_verified || !!e.ticket_verified;
    if (e.hour_local != null) minHour = minHour == null ? e.hour_local : Math.min(minHour, e.hour_local);

    // Deception layer: set-membership test, not inference. Any touch is bait
    // touched — no application anywhere legitimately references these.
    for (const t of (e.tables_touched || [])) {
      if (CANARIES.tables.includes(t)) { canaryHit = true; canaryLocator = `db:${t}`; }
    }
    if (e.cmd_raw && e.cmd_raw.includes(CANARIES.credential)) {
      canaryHit = true; canaryLocator = `vault:${CANARIES.credential}`;
    }
  }
  return { cmd_classes, tables, data_classes, rows_total, bytes_total, in_change_window, ticket_verified, hour: minHour, canaryHit, canaryLocator };
}

// hour-of-day surprisal: cheap proxy — deep night on a prod system is anomalous.
function hourSurprisal(hour) {
  if (hour == null) return 0;
  if (hour >= 1 && hour <= 4) return 0.75;   // 01:00–04:00
  if (hour >= 22 || hour === 0) return 0.45;
  if (hour >= 19 && hour <= 21) return 0.2;
  return 0;
}

const b = (id, key, list) => (list?.[id] || []).find((x) => x.feature_key === key);

/**
 * scoreSession — the whole pipeline for one session at its current event set.
 * @returns { fused, fired, decision, ctx }
 */
export function scoreSession({ identity, asset, events, baselines, from_broker = true, pq_kex = true }) {
  const acc = accumulate(events);
  const bl = baselines || {};

  // ── build bounded fusion features ─────────────────────────────────────────
  const features = [];

  // IDENTITY class — declared, auditable population priors (LLD §7.4).
  if (identity.identity_type === 'VENDOR' || identity.identity_type === 'CONTRACTOR') {
    features.push({ evidenceClass: 'IDENTITY', featureKey: 'is_vendor', observed: identity.identity_type, e: 0.6, rho: 0.5, note: 'Third-party population prior (+declared, not hidden bias)' });
  }

  // BEHAVIOUR class — volumetric + temporal, robust one-sided normalisation.
  if (acc.rows_total > 0) {
    const rb = b(identity.external_id, 'rows_read', bl);
    if (rb) {
      const { e } = normalise(acc.rows_total, rb.median, rb.mad);
      if (e > 0) features.push({ evidenceClass: 'BEHAVIOUR', featureKey: 'rows_read', observed: `${acc.rows_total.toLocaleString()} rows (usual ${rb.median.toLocaleString()})`, e, rho: 0.75, note: 'Volumetric deviation vs self-baseline' });
    }
  }
  if (acc.bytes_total > 0) {
    const bb = b(identity.external_id, 'bytes_out', bl);
    if (bb) {
      const { e } = normalise(acc.bytes_total, bb.median, bb.mad);
      if (e > 0) features.push({ evidenceClass: 'BEHAVIOUR', featureKey: 'bytes_out', observed: `${(acc.bytes_total / 1e6).toFixed(0)} MB out`, e, rho: 0.6, note: 'Egress volume deviation' });
    }
  }
  const hs = hourSurprisal(acc.hour);
  if (hs > 0) features.push({ evidenceClass: 'BEHAVIOUR', featureKey: 'hour_surprisal', observed: `${String(acc.hour).padStart(2, '0')}:00`, e: hs, rho: 0.5, note: 'Off-hours activity' });

  // CONTENT class — sensitivity of the data touched.
  if (acc.data_classes.has('AADHAAR') || acc.data_classes.has('CARD')) {
    const sev = acc.data_classes.has('AADHAAR') ? 0.9 : 0.75;
    features.push({ evidenceClass: 'CONTENT', featureKey: 'data_class', observed: [...acc.data_classes].join(', '), e: sev, rho: 0.9, note: 'Regulated data class touched' });
  }

  // CONTEXT class — the high-weight binary signals.
  if (identity.hr_flags.includes('SEPARATION_NOTICE')) features.push({ evidenceClass: 'CONTEXT', featureKey: 'hr_flag', observed: 'SEPARATION_NOTICE', e: 1.0, rho: 0.55, note: 'Adverse HR signal (analyst sees contribution, not the flag)' });
  else if (identity.hr_flags.length) features.push({ evidenceClass: 'CONTEXT', featureKey: 'hr_flag', observed: 'adverse HR signal', e: 0.7, rho: 0.4, note: 'Adverse HR signal' });
  if (acc.rows_total > 50000 && !acc.ticket_verified) features.push({ evidenceClass: 'CONTEXT', featureKey: 'ticket_verified', observed: 'no verified ticket', e: 0.8, rho: 0.7, note: 'High-impact action with no linked ticket' });
  if (acc.rows_total > 50000 && !acc.in_change_window) features.push({ evidenceClass: 'CONTEXT', featureKey: 'in_change_window', observed: 'outside change window', e: 0.6, rho: 0.4, note: 'Outside an approved change window' });

  // RELATIONAL class — peer-group deviation (the primary slow-ramp defence, §6.3.3).
  if (acc.rows_total > 0) {
    const rb = b(identity.external_id, 'rows_read', bl);
    if (rb?.peer_median) {
      const { d, e } = normalise(acc.rows_total, rb.peer_median, rb.peer_mad);
      if (e > 0) features.push({ evidenceClass: 'RELATIONAL', featureKey: 'peer_deviation', observed: `${d.toFixed(1)}σ vs ${identity.peer_group} cohort`, e, rho: 0.8, note: 'Deviation from peer cohort — an insider cannot move the cohort median' });
    }
  }

  const tier = asset.tier;
  let fused = fuse(features, tier);

  // ── rule context + evaluation ─────────────────────────────────────────────
  const ctx = {
    tier, hostname: asset.hostname, from_broker,
    hr_flags: identity.hr_flags,
    rows_total: acc.rows_total, bytes_total: acc.bytes_total,
    in_change_window: acc.in_change_window, ticket_verified: acc.ticket_verified,
    cmd_classes: acc.cmd_classes, data_classes: acc.data_classes, tables: acc.tables,
    first_time_data_class: acc.data_classes.has('AADHAAR'),
    hr_cleared: false, pq_kex,
    canaryHit: acc.canaryHit, canaryLocator: acc.canaryLocator,
  };

  const fired = evaluateRules(ctx);
  fused = applyRuleOverride(fused, fired);
  const decision = fired.length ? decisionFrom(fired) : (fused.band === 'CRITICAL' ? 'STEP_UP' : 'ALLOW');

  return { fused, fired, decision, ctx, acc };
}
