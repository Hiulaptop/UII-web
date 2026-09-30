-- UII: epilepsy monitoring schema
-- Auth is handled by NextAuth (Google). Tables are locked with RLS (no policies):
-- only the server using the service role key can read/write. Enforce access in code.

create extension if not exists pgcrypto;

-- ===== Enums =====
create type alert_type      as enum ('pre_seizure', 'fall', 'seizure');
create type alert_severity  as enum ('low', 'medium', 'high', 'critical');
create type alert_status    as enum ('open', 'acknowledged', 'resolved', 'false_alarm', 'cancelled');
create type circle_role     as enum ('owner', 'guardian', 'viewer');
create type member_status   as enum ('invited', 'active', 'removed');
create type notif_channel   as enum ('push', 'email', 'sms');
create type notif_status    as enum ('pending', 'sent', 'delivered', 'failed', 'read');
create type alert_action    as enum ('viewed', 'acknowledged', 'escalated', 'called_ems', 'resolved', 'marked_false_alarm');

-- ===== Helpers =====
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ===== 1. Users =====
create table users (
  id          uuid primary key default gen_random_uuid(),
  google_sub  text not null unique,
  email       text not null unique,
  name        text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger users_updated_at before update on users
  for each row execute function set_updated_at();

-- ===== 2. SOS profile =====
create table profiles (
  user_id        uuid primary key references users(id) on delete cascade,
  full_name      text,
  date_of_birth  date,
  sex            text,
  blood_type     text,
  height_cm      numeric(5,1),
  weight_kg      numeric(5,1),
  epilepsy_type  text,
  seizure_notes  text,
  allergies      text[] not null default '{}',
  conditions     text[] not null default '{}',
  doctor_name    text,
  doctor_phone   text,
  hospital       text,
  insurance_no   text,
  language       text not null default 'vi',
  updated_at     timestamptz not null default now()
);
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create table medications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  name        text not null,
  dosage      text,
  schedule    text,
  created_at  timestamptz not null default now()
);
create index medications_user_idx on medications (user_id);

create table emergency_contacts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  name        text not null,
  relation    text,
  phone       text not null,
  priority    int not null default 1
);
create index emergency_contacts_user_idx on emergency_contacts (user_id, priority);

create table sos_access_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index sos_access_tokens_user_idx on sos_access_tokens (user_id);

create table sos_access_logs (
  id          bigint generated always as identity primary key,
  token_id    uuid not null references sos_access_tokens(id) on delete cascade,
  accessed_at timestamptz not null default now(),
  ip          inet,
  user_agent  text
);
create index sos_access_logs_token_idx on sos_access_logs (token_id, accessed_at desc);

-- ===== 3. Circles =====
create table circles (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index circles_subject_idx on circles (subject_id);

create table circle_members (
  circle_id   uuid not null references circles(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  role        circle_role not null default 'viewer',
  status      member_status not null default 'active',
  joined_at   timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index circle_members_user_idx on circle_members (user_id);

create table circle_invites (
  id           uuid primary key default gen_random_uuid(),
  circle_id    uuid not null references circles(id) on delete cascade,
  invited_by   uuid not null references users(id) on delete cascade,
  email        text,
  code_hash    text not null unique,
  role         circle_role not null default 'viewer',
  expires_at   timestamptz not null,
  accepted_by  uuid references users(id) on delete set null,
  accepted_at  timestamptz
);
create index circle_invites_circle_idx on circle_invites (circle_id);

create table notification_preferences (
  circle_id     uuid not null,
  user_id       uuid not null,
  min_severity  alert_severity not null default 'low',
  types         alert_type[] not null default '{pre_seizure,fall,seizure}',
  channels      notif_channel[] not null default '{push}',
  quiet_start   time,
  quiet_end     time,
  primary key (circle_id, user_id),
  foreign key (circle_id, user_id)
    references circle_members (circle_id, user_id) on delete cascade
);

-- ===== 4. Devices & alerts =====
create table devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  name          text,
  model         text,
  platform      text not null default 'wearos',
  push_token    text,
  battery_pct   int check (battery_pct between 0 and 100),
  last_seen_at  timestamptz,
  paired_at     timestamptz not null default now()
);
create index devices_user_idx on devices (user_id);

create table alerts (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references users(id) on delete cascade,
  device_id     uuid references devices(id) on delete set null,
  type          alert_type not null,
  severity      alert_severity not null,
  status        alert_status not null default 'open',
  confidence    real check (confidence between 0 and 1),
  detected_at   timestamptz not null,
  lat           double precision,
  lng           double precision,
  metrics       jsonb,
  resolved_at   timestamptz,
  resolved_by   uuid references users(id) on delete set null,
  note          text,
  created_at    timestamptz not null default now()
);
create index alerts_subject_idx on alerts (subject_id, detected_at desc);
create index alerts_open_idx on alerts (subject_id) where status = 'open';

create table alert_events (
  id          bigint generated always as identity primary key,
  alert_id    uuid not null references alerts(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  action      alert_action not null,
  note        text,
  at          timestamptz not null default now()
);
create index alert_events_alert_idx on alert_events (alert_id, at);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  alert_id      uuid not null references alerts(id) on delete cascade,
  recipient_id  uuid not null references users(id) on delete cascade,
  channel       notif_channel not null,
  status        notif_status not null default 'pending',
  sent_at       timestamptz,
  read_at       timestamptz,
  error         text
);
create index notifications_alert_idx on notifications (alert_id);
create index notifications_recipient_idx on notifications (recipient_id, status);

create table sensor_samples (
  device_id    uuid not null references devices(id) on delete cascade,
  recorded_at  timestamptz not null,
  heart_rate   real,
  spo2         real,
  eda          real,
  accel_mag    real,
  temp_c       real,
  primary key (device_id, recorded_at)
);

-- ===== RLS: deny by default; server uses service role =====
alter table users                    enable row level security;
alter table profiles                 enable row level security;
alter table medications              enable row level security;
alter table emergency_contacts       enable row level security;
alter table sos_access_tokens        enable row level security;
alter table sos_access_logs          enable row level security;
alter table circles                  enable row level security;
alter table circle_members           enable row level security;
alter table circle_invites           enable row level security;
alter table notification_preferences enable row level security;
alter table devices                  enable row level security;
alter table alerts                   enable row level security;
alter table alert_events             enable row level security;
alter table notifications            enable row level security;
alter table sensor_samples           enable row level security;
