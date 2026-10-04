-- Device ingest: pairing, device tokens, signal summaries, alert idempotency and raw snapshots.
-- Run in the Supabase SQL Editor after 0003_reports.sql.

-- ===== Device credentials =====
alter table devices
  add column token_hash text unique,       -- sha256 of the device token; the token itself is never stored
  add column revoked_at timestamptz;

-- ===== Pairing codes: short-lived, single use, stored as keyed hashes =====
create table device_pairing_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  code_hash   text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index device_pairing_codes_user_idx on device_pairing_codes (user_id, created_at desc);
alter table device_pairing_codes enable row level security;

-- ===== Signal summaries (one row per window, e.g. every 5-10 seconds), not raw 50 Hz data =====
alter table sensor_samples
  add column accel_max real,
  add column accel_var real,
  add column steps int;

-- ===== Alerts: where they came from, and safe retries from the watch =====
alter table alerts
  add column client_id text check (client_id is null or char_length(client_id) between 8 and 64),
  add column trigger text not null default 'device_event' check (trigger in ('device_event', 'manual', 'algorithm'));
create unique index alerts_device_client_uniq on alerts (device_id, client_id) where client_id is not null;

-- ===== Raw burst around an alert (for later analysis), kept apart from the alert row =====
create table alert_snapshots (
  alert_id        uuid primary key references alerts(id) on delete cascade,
  sample_rate_hz  real not null check (sample_rate_hz > 0 and sample_rate_hz <= 200),
  started_at      timestamptz not null,
  axes            jsonb not null,          -- [[x, y, z], ...] in m/s^2
  created_at      timestamptz not null default now()
);
alter table alert_snapshots enable row level security;
