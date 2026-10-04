-- AI health reports: requested by a guardian, about the wearer, gated by the wearer's permission.
-- Run in the Supabase SQL Editor after 0002_circle_invites.sql.

-- ===== Wearer's permission, per member =====
alter table circle_members
  add column can_generate_reports boolean not null default false,
  add column ai_consent_at timestamptz,                     -- when the wearer granted it
  add constraint circle_members_reports_guardian_only
    check (not can_generate_reports or role = 'guardian');

alter table circle_invites
  add column allow_reports boolean not null default false,
  add constraint circle_invites_reports_guardian_only
    check (not allow_reports or role = 'guardian');

-- ===== Reports =====
create type report_status as enum ('pending', 'ready', 'failed');

create table reports (
  id             uuid primary key default gen_random_uuid(),
  subject_id     uuid not null references users(id) on delete cascade,   -- the wearer
  requested_by   uuid not null references users(id) on delete cascade,   -- the guardian who pressed the button
  period_days    int  not null check (period_days in (7, 30, 90)),
  period_start   timestamptz not null,                                   -- already clamped to the guardian's history_from
  period_end     timestamptz not null,
  status         report_status not null default 'pending',
  user_note      text check (char_length(user_note) <= 1000),            -- shown verbatim, never sent to the model
  input_snapshot jsonb,                                                  -- anonymized aggregates sent to the model
  output         jsonb,                                                  -- validated narrative returned by the model
  evidence       jsonb,                                                  -- E1..En -> real alert reference
  model          text,
  error          text,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index reports_requester_idx on reports (requested_by, created_at desc);
create index reports_subject_idx   on reports (subject_id, created_at desc);
alter table reports enable row level security;

-- ===== Heart-rate statistics without pulling every sample into the app =====
create or replace function report_sensor_stats(p_subject uuid, p_from timestamptz, p_to timestamptz)
returns table (samples bigint, avg_hr numeric, max_hr numeric, min_hr numeric, days_with_data bigint)
language sql
stable
security definer
set search_path = public
as $$
  select count(*),
         round(avg(s.heart_rate)::numeric, 1),
         round(max(s.heart_rate)::numeric, 0),
         round(min(s.heart_rate)::numeric, 0),
         count(distinct (s.recorded_at at time zone 'Asia/Ho_Chi_Minh')::date)
  from sensor_samples s
  join devices d on d.id = s.device_id
  where d.user_id = p_subject
    and s.recorded_at >= p_from
    and s.recorded_at <  p_to
    and s.heart_rate is not null;
$$;
revoke all on function report_sensor_stats(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function report_sensor_stats(uuid, timestamptz, timestamptz) to service_role;

-- ===== Accepting an invite now carries the reports permission =====
create or replace function accept_circle_invite(p_invite uuid, p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv circle_invites%rowtype;
  v_email text;
  v_subject uuid;
  v_reports boolean;
begin
  select * into inv from circle_invites where id = p_invite for update;
  if not found
     or inv.accepted_at is not null
     or inv.revoked_at is not null
     or inv.declined_at is not null
     or inv.expires_at <= now() then
    raise exception 'invite_invalid';
  end if;

  select lower(email) into v_email from users where id = p_user;
  if v_email is null or inv.email is null or v_email <> lower(inv.email) then
    raise exception 'email_mismatch';
  end if;

  select subject_id into v_subject from circles where id = inv.circle_id;
  if v_subject = p_user then
    raise exception 'invite_invalid';
  end if;

  v_reports := inv.allow_reports and inv.role = 'guardian';

  insert into circle_members (circle_id, user_id, role, status, history_from, can_generate_reports, ai_consent_at)
  values (
    inv.circle_id, p_user, inv.role, 'active',
    case when inv.history_days is null then null
         else now() - make_interval(days => inv.history_days) end,
    v_reports,
    case when v_reports then now() end
  )
  on conflict (circle_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        history_from = excluded.history_from,
        can_generate_reports = excluded.can_generate_reports,
        ai_consent_at = excluded.ai_consent_at;

  update circle_invites set accepted_by = p_user, accepted_at = now() where id = inv.id;
  return inv.circle_id;
end;
$$;
revoke all on function accept_circle_invite(uuid, uuid) from public, anon, authenticated;
grant execute on function accept_circle_invite(uuid, uuid) to service_role;
