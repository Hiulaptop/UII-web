import test from "node:test";
import assert from "node:assert/strict";
import { ageFromBirth, expiryFor, hashSosToken, isSosToken, newSosToken } from "../src/lib/sos/tokens.ts";
import { parseSosForm } from "../src/lib/sos/schema.ts";

const form = (o) => ({ get: (k) => (Array.isArray(o[k]) ? o[k][0] : o[k] ?? null), getAll: (k) => [].concat(o[k] ?? []) });
const base = { full_name: " An ", date_of_birth: "1998-05-14", sex: "Nam", blood_type: "O+", height_cm: "172,5", weight_kg: "65", epilepsy_type: "", seizure_notes: "", allergies: "Penicillin, ,Hải sản\nPhấn hoa", conditions: "", doctor_name: "", doctor_phone: "", hospital: "" };

test("SOS tokens are long, unique, recognisable and stored only as a hash", () => {
  const a = newSosToken(), b = newSosToken();
  assert.notEqual(a, b);
  assert.ok(isSosToken(a));
  assert.ok(!isSosToken(a + "x") && !isSosToken("sos_short") && !isSosToken(a.replace("sos_", "uii_")));
  assert.match(hashSosToken(a), /^[0-9a-f]{64}$/);
  assert.notEqual(hashSosToken(a), hashSosToken(b));
});

test("expiry choices are a closed set", () => {
  const now = Date.UTC(2026, 0, 1);
  assert.equal(expiryFor("30d", now).expiresAt, new Date(now + 30 * 86400000).toISOString());
  assert.equal(expiryFor("never", now).expiresAt, null);
  assert.equal(expiryFor("forever", now).ok, false);
  assert.equal(expiryFor("__proto__", now).ok, false);
  assert.equal(expiryFor("toString", now).ok, false);
});

test("age accounts for the birthday not having happened yet, and rejects nonsense", () => {
  const now = Date.UTC(2026, 4, 13);
  assert.equal(ageFromBirth("1998-05-14", now), 27);
  assert.equal(ageFromBirth("1998-05-13", now), 28);
  assert.equal(ageFromBirth(null, now), null);
  assert.equal(ageFromBirth("2030-01-01", now), null);
  assert.equal(ageFromBirth("garbage", now), null);
});

test("a valid profile form is parsed, trimmed and split into lists", () => {
  const r = parseSosForm(form({ ...base, med_name: ["Keppra", "", "Depakine"], med_dosage: ["500mg", "", ""], med_schedule: ["2 lần/ngày", "", ""], contact_name: ["Mẹ"], contact_relation: ["Mẹ"], contact_phone: ["0901 234 567"] }));
  assert.equal(r.ok, true);
  assert.equal(r.data.profile.full_name, "An");
  assert.equal(r.data.profile.height_cm, 172.5);
  assert.deepEqual(r.data.profile.allergies, ["Penicillin", "Hải sản", "Phấn hoa"]);
  assert.equal(r.data.profile.epilepsy_type, null);
  assert.deepEqual(r.data.meds.map((m) => m.name), ["Keppra", "Depakine"]);
  assert.equal(r.data.contacts[0].phone, "0901 234 567");
});

test("bad values are rejected with a message", () => {
  for (const bad of [{ blood_type: "Z+" }, { date_of_birth: "2999-01-01" }, { date_of_birth: "14/05/1998" }, { height_cm: "900" }, { weight_kg: "abc" }, { doctor_phone: "javascript:1" }, { sex: "x" }]) {
    const r = parseSosForm(form({ ...base, ...bad }));
    assert.equal(r.ok, false, JSON.stringify(bad));
    assert.ok(r.error.length > 5);
  }
});

test("phone numbers cannot smuggle anything into the tel: link", () => {
  for (const phone of ["0901234567<script>", "tel:123", "12", "+84 (28) 3822-1234 ext", "090123456789012345678901"]) {
    assert.equal(parseSosForm(form({ ...base, contact_name: ["Mẹ"], contact_phone: [phone] })).ok, false, phone);
  }
  assert.equal(parseSosForm(form({ ...base, contact_name: ["Mẹ"], contact_phone: ["+84 (28) 3822-1234"] })).ok, true);
});

test("limits: a contact needs a phone, too many rows are refused, blank rows are ignored", () => {
  assert.equal(parseSosForm(form({ ...base, contact_name: ["Mẹ"], contact_phone: [""] })).ok, false);
  assert.equal(parseSosForm(form({ ...base, med_name: ["", ""], contact_name: ["", ""] })).data.meds.length, 0);
  assert.equal(parseSosForm(form({ ...base, med_name: Array.from({ length: 21 }, (_, i) => `m${i}`) })).ok, false);
  assert.equal(parseSosForm(form({ ...base, contact_name: Array.from({ length: 6 }, (_, i) => `c${i}`), contact_phone: Array.from({ length: 6 }, () => "0901234567") })).ok, false);
  assert.equal(parseSosForm(form({ ...base, allergies: Array.from({ length: 21 }, (_, i) => `a${i}`).join(",") })).ok, false);
});
