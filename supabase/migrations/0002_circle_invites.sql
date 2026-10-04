-- Circle invites by email: history scope, revoke/decline, atomic accept.
-- Run in the Supabase SQL Editor after 0001_init.sql.

alter table circle_invites
  add column history_days int check (history_days >= 0),  -- null = full history, 0 = from acceptance
  add column revoked_at   timestamptz,
  add column declined_at  timestamptz,
  add column created_at   timestamptz not null default now();

alter table circle_members
  add column history_from timestamptz;                    -- null = full history

-- One circle per wearer.
create unique index circles_subject_uniq on circles (subject_id);

-- Only one pending invite per email per circle. Emails are stored lowercase.
create unique index circle_invites_pending_uniq
  on circle_invites (circle_id, email)
  where accepted_at is null and revoked_at is null and declined_at is null;
create index circle_invites_email_idx on circle_invites (email);
create index circle_invites_created_idx on circle_invites (circle_id, created_at desc);

-- Accept an invite atomically. Errors: invite_invalid, email_mismatch.
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

  insert into circle_members (circle_id, user_id, role, status, history_from)
  values (
    inv.circle_id, p_user, inv.role, 'active',
    case when inv.history_days is null then null
         else now() - make_interval(days => inv.history_days) end
  )
  on conflict (circle_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        history_from = excluded.history_from;

  update circle_invites set accepted_by = p_user, accepted_at = now() where id = inv.id;
  return inv.circle_id;
end;
$$;

revoke all on function accept_circle_invite(uuid, uuid) from public, anon, authenticated;
grant execute on function accept_circle_invite(uuid, uuid) to service_role;
