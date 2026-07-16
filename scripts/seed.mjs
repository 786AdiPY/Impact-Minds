// Seed Supabase with the scored world. Run AFTER pasting supabase/schema.sql
// into the SQL editor. Uses the service_role key from .env — LOCAL ONLY, never
// shipped to the browser.
//
//   node scripts/seed.mjs
//
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { IDENTITIES, ASSETS, BASELINES, SCENARIOS, buildApprovals } from '../src/lib/data.js';
import { scoreScenario } from '../src/lib/store.js';

// tiny .env reader (no dotenv dep)
const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => l.split('=').map((s) => s.trim())));
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_KEY, { auth: { persistSession: false } });

const die = (label, e) => { if (e) { console.error(`✗ ${label}:`, e.message); process.exit(1); } };

async function main() {
  console.log('→ wiping + seeding', env.VITE_SUPABASE_URL);

  // ── identities ──
  const idRows = IDENTITIES.map((i) => ({ ...i }));
  let { data: ids, error } = await sb.from('identities').upsert(idRows, { onConflict: 'external_id' }).select();
  die('identities', error);
  const idByExt = Object.fromEntries(ids.map((r) => [r.external_id, r.identity_id]));
  console.log(`  ✓ ${ids.length} identities`);

  // ── assets ──
  const { data: assets, error: aErr } = await sb.from('assets').upsert(ASSETS, { onConflict: 'hostname' }).select();
  die('assets', aErr);
  const assetByHost = Object.fromEntries(assets.map((r) => [r.hostname, r.asset_id]));
  console.log(`  ✓ ${assets.length} assets`);

  // ── baselines ──
  const blRows = Object.entries(BASELINES).flatMap(([ext, feats]) =>
    feats.map((f) => ({ identity_id: idByExt[ext], ...f })));
  die('baselines', (await sb.from('baselines').upsert(blRows)).error);
  console.log(`  ✓ ${blRows.length} baselines`);

  // ── sessions + events + scores + contributions + detections ──
  for (const key of Object.keys(SCENARIOS)) {
    const r = scoreScenario(key);
    const s = r.scenario;
    const enforced = ['TERMINATE', 'FREEZE'].includes(r.decision);
    const { data: sess, error: sErr } = await sb.from('sessions').insert({
      identity_id: idByExt[s.identity], asset_id: assetByHost[s.asset],
      protocol: r.events[0]?.event_type === 'query.executed' ? 'PGWIRE' : 'SSH',
      client_ip: s.session.client_ip, client_geo: s.session.client_geo,
      from_broker: s.session.from_broker, kex_algorithm: s.session.kex_algorithm, pq_kex: s.session.pq_kex,
      state: enforced ? 'TERMINATED' : 'CLOSED',
      end_reason: enforced ? r.fired.map((f) => f.rule_id).join('+') : null,
      peak_risk: r.fused.score, final_risk: r.fused.score,
    }).select().single();
    die('sessions', sErr);

    const evRows = r.events.map((e, i) => ({
      session_id: sess.session_id, seq: i + 1, event_type: e.event_type, cmd_class: e.cmd_class,
      cmd_raw: e.cmd_raw, tables_touched: e.tables_touched || [], data_classes: e.data_classes || [],
      rows_affected: e.rows_affected || 0, bytes_out: e.bytes_out || 0, hour_local: e.hour_local ?? null,
      in_change_window: !!e.in_change_window, ticket_verified: !!e.ticket_verified,
    }));
    die('events', (await sb.from('events').insert(evRows)).error);

    const { data: score, error: scErr } = await sb.from('scores').insert({
      session_id: sess.session_id, identity_id: idByExt[s.identity],
      score: r.fused.score, logit: r.fused.logit, band: r.fused.band,
    }).select().single();
    die('scores', scErr);

    if (r.fused.contributions.length) {
      const cRows = r.fused.contributions.map((c) => ({
        score_id: score.score_id, evidence_class: c.evidenceClass, feature_key: c.featureKey,
        observed: String(c.observed), normalised: c.normalised, weight: c.weight, logit_delta: c.logit_delta, note: c.note,
      }));
      die('contributions', (await sb.from('contributions').insert(cRows)).error);
    }

    if (r.fired.length) {
      const dRows = r.fired.map((f) => ({
        rule_id: f.rule_id, rule_name: f.rule_name, session_id: sess.session_id, identity_id: idByExt[s.identity],
        severity: f.severity, auto_action: f.auto_action, mitre: f.mitre, evidence: { why: f.why },
      }));
      die('detections', (await sb.from('detections').insert(dRows)).error);
    }
    console.log(`  ✓ ${key.padEnd(16)} score=${r.fused.score} ${r.fused.band}`);
  }

  // ── approvals (collusion) ──
  die('approvals', (await sb.from('approvals').insert(buildApprovals('2026-07-16T09:00:00Z'))).error);
  console.log('  ✓ approvals seeded');

  console.log('\n✅ seed complete');
}
main();
