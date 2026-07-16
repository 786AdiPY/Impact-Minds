-- Sentinel — Privileged Access & Insider Threat Detection
-- Simplified schema for the hackathon console (derived from LLD §5)
-- Paste this whole file into Supabase → SQL Editor → Run.

drop table if exists contributions cascade;
drop table if exists scores cascade;
drop table if exists detections cascade;
drop table if exists events cascade;
drop table if exists approvals cascade;
drop table if exists baselines cascade;
drop table if exists sessions cascade;
drop table if exists assets cascade;
drop table if exists identities cascade;

-- ── Identities: the privileged humans (and their HR + peer context) ──────────
create table identities (
  identity_id    uuid primary key default gen_random_uuid(),
  external_id    text not null,
  display_name   text not null,
  identity_type  text not null,              -- EMPLOYEE | CONTRACTOR | VENDOR | SERVICE
  department     text,
  role_name      text,                       -- dba | sre | app_admin ...
  peer_group     text,                       -- cohort key for peer deviation
  manager_name   text,
  hr_flags       text[] not null default '{}', -- SEPARATION_NOTICE | PIP | UNDER_INVESTIGATION ...
  risk_tier      smallint not null default 1
);

-- ── Assets: the protected targets, tiered T1..T4 ────────────────────────────
create table assets (
  asset_id      uuid primary key default gen_random_uuid(),
  hostname      text not null,
  asset_class   text not null,               -- POSTGRES | LINUX | SWIFT | HSM ...
  tier          smallint not null check (tier between 1 and 4),
  environment   text not null,               -- PROD | UAT | DEV
  data_classes  text[] not null default '{}' -- PII | AADHAAR | CARD | SWIFT_MSG
);

-- ── Per-identity, per-feature robust baselines (median/MAD) + peer anchor ────
create table baselines (
  identity_id  uuid references identities(identity_id),
  feature_key  text not null,
  median       double precision not null,
  mad          double precision not null,
  peer_median  double precision,            -- cohort median (slow-ramp defence)
  peer_mad     double precision,
  hard_ceiling double precision,            -- non-adaptive floor (policy, not data)
  primary key (identity_id, feature_key)
);

-- ── Sessions: one brokered privileged session ───────────────────────────────
create table sessions (
  session_id    uuid primary key default gen_random_uuid(),
  identity_id   uuid not null references identities(identity_id),
  asset_id      uuid not null references assets(asset_id),
  protocol      text not null default 'SSH',
  client_ip     text,
  client_geo    text,
  from_broker   boolean not null default true, -- false => bypass (R001)
  kex_algorithm text,
  pq_kex        boolean not null default true,
  state         text not null default 'ACTIVE', -- ACTIVE | CLOSED | TERMINATED
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  end_reason    text,
  peak_risk     smallint default 0,
  final_risk    smallint default 0
);

-- ── Events: the per-command / per-query telemetry stream ─────────────────────
create table events (
  event_id       uuid primary key default gen_random_uuid(),
  session_id     uuid not null references sessions(session_id) on delete cascade,
  seq            int not null,
  at             timestamptz not null default now(),
  event_type     text not null,              -- cmd.exec | query.executed | session.started ...
  cmd_class      text,                       -- db-dump | net-listen | log-modify | recon ...
  cmd_raw        text,
  tables_touched text[] not null default '{}',
  data_classes   text[] not null default '{}',
  rows_affected  bigint not null default 0,
  bytes_out      bigint not null default 0,
  hour_local     smallint,                   -- for hour-of-day surprisal
  in_change_window boolean not null default false,
  ticket_verified  boolean not null default false
);

-- ── Scores + exact additive attribution (the "receipt") ─────────────────────
create table scores (
  score_id     uuid primary key default gen_random_uuid(),
  session_id   uuid references sessions(session_id) on delete cascade,
  identity_id  uuid references identities(identity_id),
  evaluated_at timestamptz not null default now(),
  score        smallint not null,
  logit        double precision not null,
  band         text not null,               -- LOW | MEDIUM | HIGH | CRITICAL
  degraded     boolean not null default false
);

create table contributions (
  contribution_id uuid primary key default gen_random_uuid(),
  score_id       uuid references scores(score_id) on delete cascade,
  evidence_class text not null,             -- BEHAVIOUR | CONTENT | CONTEXT | RELATIONAL | IDENTITY
  feature_key    text not null,
  observed       text,
  normalised     double precision,          -- bounded evidence [0,1]
  weight         double precision,
  logit_delta    double precision not null, -- SUM == score.logit exactly
  note           text
);

-- ── Detections: deterministic rule fires ────────────────────────────────────
create table detections (
  detection_id uuid primary key default gen_random_uuid(),
  rule_id      text not null,               -- PAM-R017 ...
  rule_name    text not null,
  session_id   uuid references sessions(session_id) on delete cascade,
  identity_id  uuid references identities(identity_id),
  fired_at     timestamptz not null default now(),
  severity     text not null,               -- INFO | LOW | MED | HIGH | CRIT
  auto_action  text,                        -- STEP_UP | TERMINATE | FREEZE | CASE
  mitre        text[] not null default '{}',
  evidence     jsonb not null default '{}'
);

-- ── Approvals: for the §6.6 rubber-stamp / collusion finding ─────────────────
create table approvals (
  approval_id  uuid primary key default gen_random_uuid(),
  requester    text not null,
  approver     text not null,
  asset_tier   smallint,
  decision     text not null,               -- APPROVE | DENY
  requested_at timestamptz not null,
  decided_at   timestamptz not null
);

-- Realtime for the live demo
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table scores;
alter publication supabase_realtime add table detections;
alter publication supabase_realtime add table sessions;

-- Hackathon: open read/write via anon key. (In prod this is RLS per LLD §5.2.)
alter table identities   enable row level security;
alter table assets       enable row level security;
alter table baselines    enable row level security;
alter table sessions     enable row level security;
alter table events       enable row level security;
alter table scores       enable row level security;
alter table contributions enable row level security;
alter table detections   enable row level security;
alter table approvals    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['identities','assets','baselines','sessions','events','scores','contributions','detections','approvals']
  loop
    execute format('create policy anon_all on %I for all using (true) with check (true);', t);
  end loop;
end $$;
