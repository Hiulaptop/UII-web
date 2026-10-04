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
