import test from "node:test";
import assert from "node:assert/strict";
import {
  ageGroup, computeFlags, pickNotableEvents, sexCode, summarize, timeOfDay, vnDate,
} from "../src/lib/reports/rules.ts";
import { NarrativeError, generateWithRetry, narrativeViolations, narrativeJsonSchema, validateNarrative } from "../src/lib/reports/narrative.ts";

const T0 = Date.parse("2026-09-01T00:00:00+07:00");
const mk = (id, type, severity, iso, extra = {}) => ({ id, type, severity, status: "resolved", detected_at: iso, hr: null, ...extra });

test("timeOfDay uses Vietnam time, not UTC", () => {
  assert.equal(timeOfDay("2026-09-01T16:30:00Z"), "night"); // 23:30 ICT
  assert.equal(timeOfDay("2026-09-01T00:30:00Z"), "morning"); // 07:30 ICT
  assert.equal(timeOfDay("2026-09-01T06:00:00Z"), "afternoon"); // 13:00 ICT
  assert.equal(timeOfDay("2026-09-01T12:00:00Z"), "evening"); // 19:00 ICT
  assert.equal(timeOfDay("2026-09-01T22:59:59Z"), "night"); // 05:59 ICT
  assert.equal(timeOfDay("2026-09-01T23:00:00Z"), "morning"); // 06:00 ICT
});

test("vnDate rolls over at 17:00 UTC", () => {
  assert.equal(vnDate("2026-09-01T16:59:00Z"), "2026-09-01");
  assert.equal(vnDate("2026-09-01T17:00:00Z"), "2026-09-02");
});

test("summarize counts by type, severity, time, week and averages heart rate", () => {
  const alerts = [
    mk("a", "fall", "critical", "2026-09-02T20:00:00+07:00", { hr: 118 }),
    mk("b", "pre_seizure", "high", "2026-09-09T08:00:00+07:00", { hr: 100 }),
    mk("c", "pre_seizure", "medium", "2026-09-29T23:00:00+07:00", { status: "false_alarm" }),
  ];
  const s = summarize(alerts, T0, 30);
  assert.equal(s.total, 3);
  assert.deepEqual(s.by_type, { pre_seizure: 2, fall: 1, seizure: 0 });
  assert.equal(s.by_severity.critical, 1);
  assert.equal(s.by_time_of_day.evening, 1);
  assert.equal(s.by_time_of_day.morning, 1);
  assert.equal(s.by_time_of_day.night, 1);
  assert.equal(s.false_alarms, 1);
  assert.equal(s.avg_alert_hr, 109);
  assert.equal(s.by_week.length, 5);
  assert.deepEqual(s.by_week, [1, 1, 0, 0, 1]);
});

test("summarize clamps an alert on the exact end boundary into the last week", () => {
  const s = summarize([mk("z", "fall", "low", "2026-09-30T23:59:00+07:00")], T0, 30);
  assert.equal(s.by_week[s.by_week.length - 1], 1);
});

test("two seizures within 24h raise an urgent cluster flag", () => {
  const alerts = [mk("a", "seizure", "critical", "2026-09-10T02:00:00+07:00"), mk("b", "seizure", "critical", "2026-09-10T20:00:00+07:00")];
  const cur = summarize(alerts, T0, 30);
  const flags = computeFlags(cur, null, { samples: 10, avg_hr: 80, max_hr: 120, min_hr: 55, days_with_data: 30 }, 30, alerts);
  const f = flags.find((x) => x.code === "seizure_cluster");
  assert.ok(f);
  assert.equal(f.level, "urgent");
  assert.ok(!flags.some((x) => x.code === "seizure_present"));
});

test("seizures more than 24h apart are not a cluster", () => {
  const alerts = [mk("a", "seizure", "critical", "2026-09-10T02:00:00+07:00"), mk("b", "seizure", "critical", "2026-09-12T02:00:00+07:00")];
  const flags = computeFlags(summarize(alerts, T0, 30), null, { samples: 1, avg_hr: 80, max_hr: 90, min_hr: 70, days_with_data: 30 }, 30, alerts);
  assert.ok(!flags.some((x) => x.code === "seizure_cluster"));
  assert.ok(flags.some((x) => x.code === "seizure_present"));
});

test("alerts_increase needs both +2 and x1.5", () => {
  const mkN = (n) => summarize(Array.from({ length: n }, (_, i) => mk(`x${i}`, "fall", "low", "2026-09-05T10:00:00+07:00")), T0, 30);
  const sensor = { samples: 1, avg_hr: 80, max_hr: 90, min_hr: 70, days_with_data: 30 };
  assert.ok(computeFlags(mkN(5), mkN(3), sensor, 30, []).some((f) => f.code === "alerts_increase"));
  assert.ok(!computeFlags(mkN(4), mkN(3), sensor, 30, []).some((f) => f.code === "alerts_increase"));
  assert.ok(!computeFlags(mkN(10), mkN(9), sensor, 30, []).some((f) => f.code === "alerts_increase"));
  assert.ok(computeFlags(mkN(2), mkN(0), sensor, 30, []).some((f) => f.code === "alerts_increase"));
});

test("night concentration and false-alarm flags need at least 3 alerts", () => {
  const sensor = { samples: 1, avg_hr: 80, max_hr: 90, min_hr: 70, days_with_data: 30 };
  const two = [mk("a", "fall", "low", "2026-09-05T23:00:00+07:00", { status: "false_alarm" }), mk("b", "fall", "low", "2026-09-06T23:00:00+07:00", { status: "false_alarm" })];
  assert.equal(computeFlags(summarize(two, T0, 30), null, sensor, 30, two).filter((f) => ["night_concentration", "high_false_alarm"].includes(f.code)).length, 0);
  const three = [...two, mk("c", "fall", "low", "2026-09-07T23:00:00+07:00", { status: "false_alarm" })];
  const codes = computeFlags(summarize(three, T0, 30), null, sensor, 30, three).map((f) => f.code);
  assert.ok(codes.includes("night_concentration") && codes.includes("high_false_alarm"));
});

test("data coverage flags", () => {
  const cur = summarize([], T0, 30);
  assert.ok(computeFlags(cur, null, null, 30, []).some((f) => f.code === "no_sensor_data"));
  assert.ok(computeFlags(cur, null, { samples: 5, avg_hr: 80, max_hr: 90, min_hr: 70, days_with_data: 20 }, 30, []).some((f) => f.code === "low_data_coverage"));
  assert.ok(!computeFlags(cur, null, { samples: 5, avg_hr: 80, max_hr: 90, min_hr: 70, days_with_data: 21 }, 30, []).some((f) => f.code === "low_data_coverage"));
});

test("pickNotableEvents prefers seizures, caps the list, keeps chronological order and anonymous refs", () => {
  const alerts = Array.from({ length: 15 }, (_, i) => mk(`id-${i}`, i === 7 ? "seizure" : "pre_seizure", "low", `2026-09-${String(i + 1).padStart(2, "0")}T10:00:00+07:00`));
  const picked = pickNotableEvents(alerts, 10);
  assert.equal(picked.length, 10);
  assert.ok(picked.some((p) => p.alert.id === "id-7"));
  assert.deepEqual(picked.map((p) => p.ref), ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10"]);
  const times = picked.map((p) => Date.parse(p.alert.detected_at));
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test("ageGroup and sexCode never return exact birth data", () => {
  const now = Date.parse("2026-10-01T00:00:00Z");
  assert.equal(ageGroup("1998-05-14", now), "18-29");
  assert.equal(ageGroup("1990-01-01", now), "30-39");
  assert.equal(ageGroup("1950-01-01", now), "60+");
  assert.equal(ageGroup("2018-01-01", now), "dưới 13");
  assert.equal(ageGroup(null, now), null);
  assert.equal(ageGroup("not a date", now), null);
  assert.equal(ageGroup("2030-01-01", now), null);
  assert.equal(sexCode("Nam"), "male");
  assert.equal(sexCode("nữ"), "female");
  assert.equal(sexCode("khác"), "unspecified");
  assert.equal(sexCode(null), "unspecified");
});

test("narrativeViolations blocks doses, medication changes and diagnosis claims", () => {
  assert.deepEqual(narrativeViolations(["Cảnh báo tập trung vào buổi tối."]), []);
  assert.ok(narrativeViolations(["Nên tăng liều thuốc buổi tối."]).includes("medication_change"));
  assert.ok(narrativeViolations(["Uống 500 mg mỗi ngày."]).includes("dose"));
  assert.ok(narrativeViolations(["Nên ngừng thuốc nếu mệt."]).includes("medication_change"));
  assert.ok(narrativeViolations(["Người này bị động kinh nặng."]).includes("diagnosis_claim"));
  assert.deepEqual(narrativeViolations(["Hãy hỏi bác sĩ về giờ uống thuốc phù hợp."]), []);
});

const good = {
  summary: "Trong kỳ có 5 cảnh báo, tập trung vào buổi tối.",
  trends: [{ title: "Dồn vào tuần 3", observation: "Ba cảnh báo xảy ra ở tuần 3.", evidence_refs: ["E1", "E2"] }],
  discuss_with_doctor: ["Các cảnh báo về đêm có liên quan đến giờ sinh hoạt không?"],
  questions_for_doctor: ["Có cần theo dõi thêm vào ban đêm không?"],
  non_medical_suggestions: ["Ghi lại giờ ngủ trong tuần có cảnh báo."],
  data_quality_note: "Đồng hồ có dữ liệu 27 trên 30 ngày.",
};
const json = (o) => JSON.stringify(o);

test("validateNarrative accepts a well-formed narrative", () => {
  assert.equal(validateNarrative(json(good), ["E1", "E2"]).ok, true);
});

test("validateNarrative rejects bad JSON, missing fields and oversized text", () => {
  assert.equal(validateNarrative("not json", []).ok, false);
  const missing = { ...good }; delete missing.summary;
  assert.equal(validateNarrative(json(missing), []).ok, false);
  assert.equal(validateNarrative(json({ ...good, summary: "x".repeat(901) }), []).ok, false);
  assert.equal(validateNarrative(json({ ...good, questions_for_doctor: [] }), []).ok, false);
});

test("validateNarrative rejects evidence refs that do not exist", () => {
  const r = validateNarrative(json(good), ["E1"]);
  assert.equal(r.ok, false);
  assert.match(r.errors.join(" "), /E2/);
});

test("validateNarrative rejects treatment advice hidden in any field", () => {
  const r = validateNarrative(json({ ...good, non_medical_suggestions: ["Hãy tăng liều thuốc buổi tối."] }), ["E1", "E2"]);
  assert.equal(r.ok, false);
  const d = validateNarrative(json({ ...good, trends: [{ ...good.trends[0], observation: "Uống 500mg mỗi ngày." }] }), ["E1", "E2"]);
  assert.equal(d.ok, false);
});

test("generateWithRetry retries once with feedback, then succeeds", async () => {
  const calls = [];
  const out = await generateWithRetry(async (fb) => { calls.push(fb); return calls.length === 1 ? "garbage" : json(good); }, ["E1", "E2"]);
  assert.equal(out.attempts, 2);
  assert.equal(calls[0], undefined);
  assert.ok(typeof calls[1] === "string" && calls[1].length > 0);
});

test("generateWithRetry gives up after maxAttempts with the validation errors", async () => {
  let n = 0;
  await assert.rejects(generateWithRetry(async () => { n++; return "garbage"; }, []), (e) => e instanceof NarrativeError && e.errors.length > 0);
  assert.equal(n, 2);
});

test("generateWithRetry does not swallow transport errors", async () => {
  await assert.rejects(generateWithRetry(async () => { throw new Error("network"); }, []), /network/);
});

test("JSON schema sent to the model has no $schema key and forbids extra properties", () => {
  assert.equal("$schema" in narrativeJsonSchema, false);
  assert.equal(narrativeJsonSchema.additionalProperties, false);
  assert.ok(narrativeJsonSchema.required.includes("summary"));
});
