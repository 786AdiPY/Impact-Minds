// Deterministic rule engine — LLD §6.2.
// These are CONCLUSIONS, not evidence. High-confidence, explainable, and the
// only layer permitted to auto-enforce. Each is a pure predicate over a
// session's accumulated event context.

export const RULES = [
  {
    rule_id: 'PAM-R070', rule_name: 'Decoy object accessed (honeytoken)',
    severity: 'CRIT', auto_action: 'TERMINATE', mitre: ['T1078'],
    precision: 1.0, mlInvolved: false,
    test: (ctx) => ctx.canaryHit === true,
    why: (ctx) => `${ctx.canaryLocator} — no application anywhere legitimately references this. Any touch is bait touched.`,
  },
  {
    rule_id: 'PAM-R001', rule_name: 'Bypass: auth to T3/T4 from non-broker source IP',
    severity: 'CRIT', auto_action: 'FREEZE', mitre: ['T1078.003'],
    test: (ctx) => ctx.tier >= 3 && ctx.from_broker === false,
    why: (ctx) => `Session reached T${ctx.tier} ${ctx.hostname} outside the broker — the architecture's canary.`,
  },
  {
    rule_id: 'PAM-R012', rule_name: 'Access during/after a separation notice',
    severity: 'HIGH', auto_action: 'STEP_UP', mitre: [],
    test: (ctx) => ctx.hr_flags.includes('SEPARATION_NOTICE'),
    why: () => `Actor is under a SEPARATION_NOTICE — the strongest insider correlate in incident post-mortems.`,
  },
  {
    rule_id: 'PAM-R017', rule_name: 'Bulk export from T3/T4, no change window, no verified ticket',
    severity: 'HIGH', auto_action: 'TERMINATE', mitre: ['T1530'],
    test: (ctx) => ctx.tier >= 3 && (ctx.rows_total > 100000 || ctx.bytes_total > 500e6)
                   && !ctx.in_change_window && !ctx.ticket_verified,
    why: (ctx) => `${ctx.rows_total.toLocaleString()} rows exported from T${ctx.tier}, no change window, no verified ticket.`,
  },
  {
    rule_id: 'PAM-R018', rule_name: 'COPY TO PROGRAM / xp_cmdshell / UTL_FILE',
    severity: 'CRIT', auto_action: 'TERMINATE', mitre: ['T1059'],
    test: (ctx) => ctx.cmd_classes.has('rce-primitive'),
    why: () => `A remote-code-execution primitive was invoked on a database target.`,
  },
  {
    rule_id: 'PAM-R022', rule_name: 'AADHAAR/CARD access with no such entitlement history',
    severity: 'HIGH', auto_action: 'STEP_UP', mitre: ['T1213'],
    test: (ctx) => ctx.data_classes.has('AADHAAR') && ctx.first_time_data_class,
    why: () => `Query touched AADHAAR data this identity has never accessed before.`,
  },
  {
    rule_id: 'PAM-R044', rule_name: 'Obfuscated command construction (base64/hex → shell)',
    severity: 'HIGH', auto_action: 'STEP_UP', mitre: ['T1027'],
    test: (ctx) => ctx.cmd_classes.has('obfuscation'),
    why: () => `base64/hex decode piped into a shell — evasion of command extraction.`,
  },
  {
    rule_id: 'PAM-R019', rule_name: 'SSH port-forward / SOCKS from a T3/T4 jump target',
    severity: 'HIGH', auto_action: 'TERMINATE', mitre: ['T1572'],
    test: (ctx) => ctx.cmd_classes.has('port-forward') && ctx.tier >= 3,
    why: () => `A port-forward / SOCKS tunnel was established — the classic exfil primitive.`,
  },
  {
    rule_id: 'PAM-R052', rule_name: 'HR-signal table accessed by non-HR-cleared identity',
    severity: 'CRIT', auto_action: 'TERMINATE', mitre: [],
    test: (ctx) => ctx.tables.has('iam.identity_hr_signal') && !ctx.hr_cleared,
    why: () => `The most sensitive table in the schema was read by an uncleared identity.`,
  },
  {
    rule_id: 'PAM-R041', rule_name: 'Non-PQ key exchange negotiated on a T4 asset',
    severity: 'MED', auto_action: 'CASE', mitre: [],
    test: (ctx) => ctx.tier === 4 && ctx.pq_kex === false,
    why: () => `pq_kex=false on a crown-jewel asset — a harvest-now-decrypt-later exposure.`,
  },
];

// Evaluate all rules against an accumulated session context, return fired rules.
export function evaluateRules(ctx) {
  const fired = [];
  for (const r of RULES) {
    try {
      if (r.test(ctx)) {
        fired.push({
          rule_id: r.rule_id, rule_name: r.rule_name, severity: r.severity,
          auto_action: r.auto_action, mitre: r.mitre, why: r.why(ctx),
          precision: r.precision, mlInvolved: r.mlInvolved,
        });
      }
    } catch { /* missing ctx field => rule simply doesn't fire */ }
  }
  return fired;
}

// The strongest auto-action across fired rules (drives the enforcement decision).
export function decisionFrom(fired) {
  const rank = { TERMINATE: 4, FREEZE: 3, STEP_UP: 2, CASE: 1 };
  let best = null;
  for (const f of fired) {
    if (!f.auto_action) continue;
    if (!best || (rank[f.auto_action] || 0) > (rank[best.auto_action] || 0)) best = f;
  }
  return best?.auto_action || 'ALLOW';
}
