# Sentinel — Insider Threat Detection Console

A privileged-access governance console that ranks every privileged session by
insider-threat risk and shows **exactly why** — no black box. Built from the
Sentinel LLD (`pam-insider-threat-lld.md`), scoped to the detection plane.

> **Contract:** ML ranks, deterministic rules decide. Every point of a risk score
> is attributed to a source event and provably reconstructs the score.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

That's it — the detection engine runs **client-side**, so the demo works with no
backend and no network. Supabase is optional persistence (below).

## What's in it

| View | What it shows | LLD ref |
|---|---|---|
| **Threat Queue** | Fixed top-N sessions ranked by risk. Bounded queue, not a threshold. | §13.1 |
| **Session detail** | The *receipt* — per-feature `logit_delta` that sums to the score exactly; rules fired w/ MITRE; transcript; terminate button. | §6.5 |
| **Live Scoring** | Stream a purple-team scenario event-by-event; watch risk climb and the session auto-terminate at CRITICAL. | §3.3, §14.2 |
| **Findings** | Maker-checker rubber-stamp / collusion detection — one SQL query, no ML. | §6.6 |

### The engine (the real part)

- `src/lib/fusion.js` — risk fusion (§6.5): robust one-sided normalisation,
  noisy-OR within evidence class, log-odds across classes, tier multiplier,
  rule override. **Exact additive attribution** (invariant asserted live in the UI).
- `src/lib/rules.js` — deterministic rules (§6.2): R001 bypass, R012 separation,
  R017 bulk export, R018 RCE, R022 first-time AADHAAR, R041 non-PQ KEX, R044
  obfuscation, R052 HR-table access.
- `src/lib/engine.js` — feature extraction from events → fusion + rules.
- `src/lib/data.js` — the cast, assets, robust baselines, and scenarios.

## Demo script (~2 min)

1. **Queue** — "Of 22,000 sessions today, these need a human." Priya sits at #1.
2. **Open Priya** — walk the receipt: AADHAAR +2.75, peer-deviation 105σ +2.19,
   resignation flag +1.03. Point at the footer: `|Σ logit_delta − logit| = 1e-6`
   → *the explanation is exact, not a SHAP approximation.* Rules R012/R017/R022
   fired → **TERMINATE**.
3. **Live Scoring → Priya → Replay attack** — risk climbs 14 → 100 as events
   stream; rules light up; session **self-terminates**. The closed loop, live.
4. **Findings** — S. Iyer approved 26/26 of Vikram's requests in ~20s each.
   "That's not a control, that's a reflex." No ML, one query.
5. **Divya (slow-ramp)** — caught by *peer deviation*, not her own baseline —
   the attack the naive UEBA misses.

## Supabase (optional persistence + realtime)

Creds live in `.env` (gitignored). The key there is a **service_role** key used
only by the local seed script — for a real frontend, swap in the `anon` key.

```bash
# 1. Paste supabase/schema.sql into Supabase → SQL Editor → Run
# 2. Seed it:
node scripts/seed.mjs
```

## Making the SSH broker real (the "chokepoint")

Today the console consumes *seeded* events. To feed it **real** privileged
sessions, drop in a broker that proxies SSH/pgwire and emits events in the
`events` shape (`src/lib/data.js`). Minimal path:

- **SSH proxy** — a Node [`ssh2`](https://github.com/mscdex/ssh2) `Server` (or
  Python `paramiko`) that accepts the human on the ingress side, opens a second
  connection to the target on the egress side, and pumps bytes between them.
  Mint a short-lived cert / inject the credential so the human never sees it (§2.4).
- **Command extraction** — for `exec` channels the command is a discrete string
  (easy). For interactive `shell`, run a VT100 parser over the PTY stream and diff
  the line at the cursor between prompt anchors (§4.1.1) — ~85%, defeatable, and
  that's honest.
- **pgwire proxy** — a TCP proxy that parses Postgres frames; pull
  `rows_affected` off the `CommandComplete` tag and the statement off `Query`
  frames. `rows_read` is the single highest-weight feature.
- **Emit** — on each command/query, `POST` an event (or `supabase.insert`) with
  `{session_id, cmd_raw, cmd_class, tables_touched, data_classes, rows_affected,
  hour_local}`. The existing engine scores it unchanged.
- **Kill switch** — subscribe to a control channel; on `TERMINATE`, close both
  sockets and rotate the target credential (§4.1.4).

The console's detection brain is already the real thing — the broker is just a
different *source* of the same events. That's the deliberate seam (`ScoringPort`
/ `TelemetrySinkPort` in the LLD).
