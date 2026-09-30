-- Demo data for one account. Sign in to the website once first (creates the users row),
-- then set the email below and run this in the Supabase SQL Editor.
-- Safe to re-run: it deletes the previous demo data for that account first.

do $$
declare
  v_email text := 'tlthieu200802@gmail.com';  -- <== change this
  v_user uuid;
  v_device uuid;
  v_circle uuid;
  v_alert uuid;
begin
  select id into v_user from users where email = v_email;
  if v_user is null then
    raise exception 'No users row for %. Sign in to the website first.', v_email;
  end if;

  delete from devices where user_id = v_user;             -- cascades sensor_samples
  delete from alerts where subject_id = v_user;           -- cascades alert_events, notifications
  delete from medications where user_id = v_user;
  delete from emergency_contacts where user_id = v_user;
  delete from circles where subject_id = v_user;          -- cascades members, prefs, invites
  delete from profiles where user_id = v_user;

  insert into profiles (user_id, full_name, blood_type, epilepsy_type, allergies, seizure_notes)
  values (v_user, null, 'O+', 'Động kinh cục bộ', '{Penicillin}',
          'Nghiêng người sang một bên, không cho gì vào miệng, gọi 115 nếu cơn kéo dài quá 5 phút.');

  insert into medications (user_id, name, dosage, schedule)
  values (v_user, 'Levetiracetam', '500mg', '2 lần/ngày');

  insert into emergency_contacts (user_id, name, relation, phone, priority)
  values (v_user, 'Nguyễn Thị Hoa', 'Mẹ', '0901 234 567', 1);

  insert into devices (user_id, name, model, battery_pct, last_seen_at)
  values (v_user, 'Galaxy Watch 7', 'SM-L310', 72, now() - interval '2 minutes')
  returning id into v_device;

  -- 24h of heart rate every 5 minutes, with a spike ~3h ago
  insert into sensor_samples (device_id, recorded_at, heart_rate)
  select v_device, t,
         72 + 6 * sin(extract(epoch from t) / 3600.0)
            + case when t between now() - interval '3 hours 20 minutes' and now() - interval '2 hours 40 minutes' then 30 else 0 end
            + random() * 4
  from generate_series(now() - interval '24 hours', now(), interval '5 minutes') t;

  insert into alerts (subject_id, device_id, type, severity, status, confidence, detected_at, lat, lng, metrics)
  values (v_user, v_device, 'pre_seizure', 'high', 'open', 0.87, now() - interval '3 hours', 10.7769, 106.7009, '{"heart_rate": 104}');

  insert into alerts (subject_id, device_id, type, severity, status, confidence, detected_at, lat, lng, metrics, resolved_at, resolved_by)
  values (v_user, v_device, 'fall', 'critical', 'resolved', 0.95, now() - interval '2 days', 10.7800, 106.6950, '{"heart_rate": 118}', now() - interval '2 days' + interval '20 minutes', v_user)
  returning id into v_alert;
  insert into alert_events (alert_id, user_id, action, at)
  values (v_alert, v_user, 'acknowledged', now() - interval '2 days' + interval '45 seconds');

  insert into alerts (subject_id, device_id, type, severity, status, confidence, detected_at, metrics)
  values (v_user, v_device, 'pre_seizure', 'medium', 'false_alarm', 0.61, now() - interval '3 days', '{"heart_rate": 96}')
  returning id into v_alert;
  insert into alert_events (alert_id, user_id, action, at)
  values (v_alert, v_user, 'acknowledged', now() - interval '3 days' + interval '52 seconds');

  insert into circles (subject_id, name) values (v_user, 'Gia đình') returning id into v_circle;
  insert into circle_members (circle_id, user_id, role, status) values (v_circle, v_user, 'owner', 'active');
end $$;
