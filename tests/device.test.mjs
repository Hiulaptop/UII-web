import test from "node:test";
import assert from "node:assert/strict";
import { formatCode, hashCode, hashToken, newDeviceToken, newPairingCode, normalizeCode, parseBearer } from "../src/lib/device/tokens.ts";
import { createLimiter } from "../src/lib/device/rate-limit.ts";
import {
  MAX_SAMPLES_PER_REQUEST, alertBodySchema, defaultSeverity, pairSchema, sampleSchema, samplesBodySchema, timestampOk,
} from "../src/lib/device/schemas.ts";
import { inQuietHours, recipientsFor } from "../src/lib/notify/recipients.ts";

test("device tokens are long, unique, prefixed and parse back from a Bearer header", () => {
  const a = newDeviceToken(), b = newDeviceToken();
  assert.notEqual(a, b);
  assert.match(a, /^uii_[A-Za-z0-9_-]{43}$/);
  assert.equal(parseBearer(`Bearer ${a}`), a);
  assert.equal(parseBearer(`bearer ${a}`), null); // scheme is case sensitive on purpose
  assert.equal(parseBearer(`Bearer ${a}x`), null);
  assert.equal(parseBearer("Bearer abc"), null);
  assert.equal(parseBearer(null), null);
  assert.equal(parseBearer(`Basic ${a}`), null);
});

test("only the hash of a token is ever needed for lookup", () => {
  const t = newDeviceToken();
  assert.match(hashToken(t), /^[0-9a-f]{64}$/);
  assert.equal(hashToken(t), hashToken(t));
  assert.notEqual(hashToken(t), hashToken(newDeviceToken()));
  assert.ok(!hashToken(t).includes(t.slice(4, 20)));
});

test("pairing codes are 8 digits, zero padded, normalised from user input, and keyed-hashed", () => {
  for (let i = 0; i < 200; i++) assert.match(newPairingCode(), /^\d{8}$/);
  assert.equal(normalizeCode("4829 1375"), "48291375");
  assert.equal(normalizeCode("4829-1375"), "48291375");
  assert.equal(normalizeCode(" 00000042 "), "00000042");
  assert.equal(normalizeCode("1234567"), null);
  assert.equal(normalizeCode("123456789"), null);
  assert.equal(normalizeCode("1234abcd"), null);
  assert.equal(formatCode("48291375"), "4829 1375");
  assert.notEqual(hashCode("48291375", "secret-a"), hashCode("48291375", "secret-b"));
  assert.equal(hashCode("48291375", "s"), hashCode("48291375", "s"));
});

test("rate limiter allows N per window, then blocks, then recovers; keys are independent", () => {
  const l = createLimiter(3, 1000);
  assert.ok(l.allow("a", 0) && l.allow("a", 100) && l.allow("a", 200));
  assert.equal(l.allow("a", 300), false);
  assert.ok(l.allow("b", 300));
  assert.equal(l.allow("a", 999), false);
  assert.ok(l.allow("a", 1001)); // the hit at 0 left the window
  assert.equal(l.allow("a", 1050), false); // 100, 200 and 1001 are still inside it
  assert.ok(l.allow("a", 1101)); // 100 has now left
});

test("sample schema accepts valid windows and rejects out-of-range, empty and unknown fields", () => {
  assert.ok(sampleSchema.safeParse({ t: 1_700_000_000_000, hr: 72, accel_mean: 9.8, accel_max: 14, accel_var: 0.3, steps: 5 }).success);
  assert.ok(!sampleSchema.safeParse({ t: 1_700_000_000_000 }).success); // no measurement
  assert.ok(!sampleSchema.safeParse({ t: 1_700_000_000_000, hr: 400 }).success);
  assert.ok(!sampleSchema.safeParse({ t: 1_700_000_000_000, hr: 10 }).success);
  assert.ok(!sampleSchema.safeParse({ t: -5, hr: 70 }).success);
  assert.ok(!sampleSchema.safeParse({ t: 1.5, hr: 70 }).success);
  assert.ok(!sampleSchema.safeParse({ t: 1_700_000_000_000, hr: 70, ssn: "x" }).success);
  assert.ok(!sampleSchema.safeParse({ t: 1_700_000_000_000, hr: "70" }).success);
});

test("samples body enforces a hard cap on batch size", () => {
  const mk = (n) => ({ samples: Array.from({ length: n }, (_, i) => ({ t: 1 + i, hr: 70 })) });
  assert.ok(samplesBodySchema.safeParse(mk(MAX_SAMPLES_PER_REQUEST)).success);
  assert.ok(!samplesBodySchema.safeParse(mk(MAX_SAMPLES_PER_REQUEST + 1)).success);
  assert.ok(!samplesBodySchema.safeParse({ samples: [] }).success);
  assert.ok(!samplesBodySchema.safeParse({ samples: [{ t: 1, hr: 70 }], battery_pct: 101 }).success);
});

test("timestamps: slightly in the future is tolerated, far future and stale are rejected", () => {
  const now = 1_800_000_000_000;
  assert.ok(timestampOk(now - 1000, now));
  assert.ok(timestampOk(now + 60_000, now));
  assert.ok(!timestampOk(now + 10 * 60_000, now));
  assert.ok(timestampOk(now - 6 * 86_400_000, now));
  assert.ok(!timestampOk(now - 8 * 86_400_000, now));
});

test("alert schema: required fields, id format, coordinate ranges, snapshot limits", () => {
  const base = { client_id: "watch-0001-abcd", type: "fall", detected_at: 1_800_000_000_000 };
  const ok = alertBodySchema.parse(base);
  assert.equal(ok.trigger, "device_event"); // default
  assert.ok(alertBodySchema.safeParse({ ...base, trigger: "manual", lat: 10.77, lng: 106.7, confidence: 0.9, metrics: { heart_rate: 120 } }).success);
  assert.ok(!alertBodySchema.safeParse({ ...base, client_id: "short" }).success);
  assert.ok(!alertBodySchema.safeParse({ ...base, client_id: "has space in it!" }).success);
  assert.ok(!alertBodySchema.safeParse({ ...base, type: "sos" }).success);
  assert.ok(!alertBodySchema.safeParse({ ...base, lat: 91 }).success);
  assert.ok(!alertBodySchema.safeParse({ ...base, confidence: 1.2 }).success);
  assert.ok(!alertBodySchema.safeParse({ ...base, severity: "extreme" }).success);
  assert.ok(!alertBodySchema.safeParse({ ...base, unknown: 1 }).success);
  const snap = (n) => ({ ...base, snapshot: { sample_rate_hz: 50, started_at: 1, axes: Array.from({ length: n }, () => [0, 0, 9.8]) } });
  assert.ok(alertBodySchema.safeParse(snap(12_000)).success);
  assert.ok(!alertBodySchema.safeParse(snap(12_001)).success);
  assert.ok(!alertBodySchema.safeParse(snap(0)).success);
});

test("pair schema trims and bounds free text", () => {
  assert.ok(pairSchema.safeParse({ code: "4829 1375", name: "Galaxy Watch", model: "SM-L310", platform: "wearos" }).success);
  assert.ok(!pairSchema.safeParse({ code: "1" }).success);
  assert.ok(!pairSchema.safeParse({ code: "48291375", name: "x".repeat(61) }).success);
});

test("default severity: early warning is high, fall and seizure are critical", () => {
  assert.equal(defaultSeverity("pre_seizure"), "high");
  assert.equal(defaultSeverity("fall"), "critical");
  assert.equal(defaultSeverity("seizure"), "critical");
});

// ---- fan-out decisions ----
const ICT = (h, m = 0) => Date.UTC(2026, 9, 3, h - 7, m); // a moment at h:m Vietnam time
const prefs = (o = {}) => ({ min_severity: "low", types: ["pre_seizure", "fall", "seizure"], channels: ["push"], quiet_start: null, quiet_end: null, ...o });

test("members without saved preferences get push for every alert", () => {
  const r = recipientsFor({ type: "fall", severity: "low" }, [{ user_id: "u1", prefs: null }], ICT(12));
  assert.deepEqual(r, [{ user_id: "u1", channel: "push" }]);
});

test("severity floor and alert types filter non-critical alerts", () => {
  const m = [{ user_id: "u1", prefs: prefs({ min_severity: "high" }) }, { user_id: "u2", prefs: prefs({ types: ["seizure"] }) }];
  assert.deepEqual(recipientsFor({ type: "fall", severity: "medium" }, m, ICT(12)), []);
  assert.deepEqual(recipientsFor({ type: "fall", severity: "high" }, m, ICT(12)).map((x) => x.user_id), ["u1"]);
  assert.deepEqual(recipientsFor({ type: "seizure", severity: "high" }, m, ICT(12)).map((x) => x.user_id).sort(), ["u1", "u2"]);
});

test("a critical alert is never filtered, even in quiet hours or below the floor", () => {
  const p = prefs({ min_severity: "high", types: [], quiet_start: "22:00", quiet_end: "06:00" });
  assert.equal(recipientsFor({ type: "seizure", severity: "critical" }, [{ user_id: "u1", prefs: p }], ICT(23)).length, 1);
  assert.equal(recipientsFor({ type: "seizure", severity: "high" }, [{ user_id: "u1", prefs: p }], ICT(23)).length, 0);
});

test("quiet hours handle overnight windows, same-day windows and empty windows", () => {
  const night = prefs({ quiet_start: "22:00:00", quiet_end: "06:00:00" });
  assert.ok(inQuietHours(night, ICT(23)));
  assert.ok(inQuietHours(night, ICT(2)));
  assert.ok(inQuietHours(night, ICT(22, 0)));
  assert.ok(!inQuietHours(night, ICT(6, 0)));
  assert.ok(!inQuietHours(night, ICT(12)));
  const day = prefs({ quiet_start: "13:00", quiet_end: "14:00" });
  assert.ok(inQuietHours(day, ICT(13, 30)));
  assert.ok(!inQuietHours(day, ICT(14, 0)));
  assert.ok(!inQuietHours(prefs({ quiet_start: "08:00", quiet_end: "08:00" }), ICT(8)));
  assert.ok(!inQuietHours(prefs(), ICT(3)));
});

test("multiple channels produce one row each, without duplicates; empty channels fall back to push", () => {
  const r = recipientsFor({ type: "fall", severity: "high" }, [{ user_id: "u1", prefs: prefs({ channels: ["push", "email", "email"] }) }, { user_id: "u2", prefs: prefs({ channels: [] }) }], ICT(12));
  assert.deepEqual(r.filter((x) => x.user_id === "u1").map((x) => x.channel).sort(), ["email", "push"]);
  assert.deepEqual(r.filter((x) => x.user_id === "u2"), [{ user_id: "u2", channel: "push" }]);
});
