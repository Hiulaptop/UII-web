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
