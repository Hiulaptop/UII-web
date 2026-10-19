-- Combined 0004-0006. 0003 is already applied. Run once, in this order.

-- ===== 0004_devices_ingest.sql =====
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

-- ===== 0005_sos_profile.sql =====
-- Saves the SOS profile, medications and emergency contacts in one transaction, so a failed save
-- never leaves a card with the medication list wiped. Called only by the server (service role).

create or replace function save_sos_profile(p_user uuid, p_profile jsonb, p_meds jsonb, p_contacts jsonb)
returns void
language plpgsql
as $$
begin
  insert into profiles (user_id, full_name, date_of_birth, sex, blood_type, height_cm, weight_kg,
                        epilepsy_type, seizure_notes, allergies, conditions,
                        doctor_name, doctor_phone, hospital, insurance_no)
  values (
    p_user,
    nullif(p_profile->>'full_name', ''),
    nullif(p_profile->>'date_of_birth', '')::date,
    nullif(p_profile->>'sex', ''),
    nullif(p_profile->>'blood_type', ''),
    nullif(p_profile->>'height_cm', '')::numeric,
    nullif(p_profile->>'weight_kg', '')::numeric,
    nullif(p_profile->>'epilepsy_type', ''),
    nullif(p_profile->>'seizure_notes', ''),
    coalesce(array(select jsonb_array_elements_text(p_profile->'allergies')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_profile->'conditions')), '{}'),
    nullif(p_profile->>'doctor_name', ''),
    nullif(p_profile->>'doctor_phone', ''),
    nullif(p_profile->>'hospital', ''),
    nullif(p_profile->>'insurance_no', '')
  )
  on conflict (user_id) do update set
    full_name = excluded.full_name, date_of_birth = excluded.date_of_birth, sex = excluded.sex,
    blood_type = excluded.blood_type, height_cm = excluded.height_cm, weight_kg = excluded.weight_kg,
    epilepsy_type = excluded.epilepsy_type, seizure_notes = excluded.seizure_notes,
    allergies = excluded.allergies, conditions = excluded.conditions,
    doctor_name = excluded.doctor_name, doctor_phone = excluded.doctor_phone,
    hospital = excluded.hospital, insurance_no = excluded.insurance_no;

  delete from medications where user_id = p_user;
  insert into medications (user_id, name, dosage, schedule)
  select p_user, m->>'name', nullif(m->>'dosage', ''), nullif(m->>'schedule', '')
  from jsonb_array_elements(p_meds) as m;

  delete from emergency_contacts where user_id = p_user;
  insert into emergency_contacts (user_id, name, relation, phone, priority)
  select p_user, c.v->>'name', nullif(c.v->>'relation', ''), c.v->>'phone', c.i::int
  from jsonb_array_elements(p_contacts) with ordinality as c(v, i);
end;
$$;

revoke all on function save_sos_profile(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function save_sos_profile(uuid, jsonb, jsonb, jsonb) to service_role;

-- ===== 0006_medications_calendar.sql =====
-- Medication schedules (when to take what), the log of doses taken, and the optional Google Calendar connection.
-- Access is enforced in the server code (service role); RLS is on with no policies, as everywhere else.

create table medication_schedules (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  name               text not null check (char_length(name) between 1 and 80),
  dosage             text check (char_length(dosage) <= 60),
  times              time[] not null check (cardinality(times) between 1 and 8),
  days               smallint[] not null default '{1,2,3,4,5,6,7}' check (cardinality(days) between 1 and 7),  -- ISO: 1 = Monday .. 7 = Sunday
  start_date         date not null,
  end_date           date check (end_date is null or end_date >= start_date),
  remind             boolean not null default false,
  lead_minutes       smallint not null default 0 check (lead_minutes in (0, 10)),
  calendar_event_ids jsonb not null default '{}'::jsonb,   -- "HH:MM" -> id of the recurring Google event
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index medication_schedules_user_idx on medication_schedules (user_id);
create trigger medication_schedules_updated_at before update on medication_schedules
  for each row execute function set_updated_at();

create table medication_logs (
  id            uuid primary key default gen_random_uuid(),
  schedule_id   uuid not null references medication_schedules(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  scheduled_for timestamptz not null,                      -- the dose this log answers
  taken_at      timestamptz not null default now(),
  unique (schedule_id, scheduled_for)
);
create index medication_logs_user_idx on medication_logs (user_id, scheduled_for desc);

-- One connection per user. The refresh token is stored encrypted by the application (AES-256-GCM).
create table google_connections (
  user_id            uuid primary key references users(id) on delete cascade,
  provider_email     text,
  scopes             text not null,
  refresh_token_enc  text not null,
  calendar_id        text,
  connected_at       timestamptz not null default now(),
  last_sync_at       timestamptz,
  last_error         text
);

alter table medication_schedules enable row level security;
alter table medication_logs      enable row level security;
alter table google_connections   enable row level security;
