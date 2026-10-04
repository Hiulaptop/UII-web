import test from "node:test";
import assert from "node:assert/strict";
import { activeOn, addDays, daysSummary, doseInstant, dosesForDate, firstDoseDate, isoWeekday, parseScheduleForm, vnDate } from "../src/lib/medication/schedule.ts";
import { buildEvents, untilUtc } from "../src/lib/medication/calendar-events.ts";

const form = (o) => ({ get: (k) => (Array.isArray(o[k]) ? o[k][0] : o[k] ?? null), getAll: (k) => [].concat(o[k] ?? []) });
const good = { name: " Levetiracetam ", dosage: "500mg", time: ["20:00", "08:00", "08:00"], day: ["1", "3", "3", "7"], start_date: "2026-10-02", end_date: "", remind: "on", lead_minutes: "10" };

test("a schedule form is parsed, de-duplicated and sorted", () => {
  const r = parseScheduleForm(form(good));
  assert.equal(r.success, true);
  assert.equal(r.data.name, "Levetiracetam");
  assert.deepEqual(r.data.times, ["08:00", "20:00"]);
  assert.deepEqual(r.data.days, [1, 3, 7]);
  assert.equal(r.data.end_date, null);
  assert.equal(r.data.remind, true);
  assert.equal(r.data.lead_minutes, 10);
});

test("bad schedules are refused", () => {
  const bad = [{ name: "" }, { time: [] }, { time: ["25:00"] }, { time: ["8:00"] }, { day: [] }, { day: ["8"] }, { day: ["0"] },
    { start_date: "2026-02-30" }, { start_date: "02/10/2026" }, { end_date: "2026-10-01" }, { dosage: "x".repeat(61) },
    { time: Array.from({ length: 9 }, (_, i) => `0${i}:00`) }];
  for (const b of bad) assert.equal(parseScheduleForm(form({ ...good, ...b })).success, false, JSON.stringify(b));
});

test("lead minutes can only be 0 or 10", () => {
  assert.equal(parseScheduleForm(form({ ...good, lead_minutes: "37" })).data.lead_minutes, 0);
  assert.equal(parseScheduleForm(form({ ...good, remind: undefined })).data.remind, false);
});

test("weekdays and Vietnam dates", () => {
  assert.equal(isoWeekday("2026-10-04"), 7); // a Sunday
  assert.equal(isoWeekday("2026-10-05"), 1);
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(vnDate(Date.parse("2026-10-03T20:00:00Z")), "2026-10-04"); // already tomorrow in Vietnam
  assert.equal(doseInstant("2026-10-04", "08:00"), "2026-10-04T01:00:00.000Z");
  assert.equal(daysSummary([1, 2, 3, 4, 5, 6, 7]), "Hằng ngày");
  assert.equal(daysSummary([1, 3, 7]), "T2, T4, CN");
});

test("a schedule is active only inside its dates and on its days", () => {
  const s = { days: [1, 3], start_date: "2026-10-05", end_date: "2026-10-14" };
  assert.equal(activeOn(s, "2026-10-05"), true);  // Monday
  assert.equal(activeOn(s, "2026-10-06"), false); // Tuesday
  assert.equal(activeOn(s, "2026-10-12"), true);
  assert.equal(activeOn(s, "2026-10-14"), true);  // Wednesday, last day
  assert.equal(activeOn(s, "2026-10-19"), false); // after the end
  assert.equal(activeOn(s, "2026-09-30"), false);
  assert.equal(activeOn({ ...s, end_date: null }, "2027-01-04"), true);
  assert.equal(firstDoseDate({ days: [3], start_date: "2026-10-05" }), "2026-10-07");
});

test("today's doses are sorted and marked taken from the log", () => {
  const sch = [
    { id: "a", name: "Keppra", dosage: "500mg", times: ["20:00:00", "08:00:00"], days: [1, 2, 3, 4, 5, 6, 7], start_date: "2026-10-01", end_date: null },
    { id: "b", name: "Vitamin", dosage: null, times: ["08:00"], days: [1], start_date: "2026-10-01", end_date: null }, // Monday only
  ];
  const logs = [{ schedule_id: "a", scheduled_for: doseInstant("2026-10-04", "08:00"), taken_at: "2026-10-04T01:02:00Z" }];
  const d = dosesForDate(sch, "2026-10-04", logs);
  assert.deepEqual(d.map((x) => `${x.time} ${x.label}`), ["08:00 Keppra 500mg", "20:00 Keppra 500mg"]);
  assert.equal(d[0].takenAt, "2026-10-04T01:02:00Z");
  assert.equal(d[1].takenAt, null);
  assert.equal(dosesForDate(sch, "2026-10-05", []).length, 3); // Monday adds the vitamin
});

test("calendar events: one recurring event per dose time, starting early when asked", () => {
  const ev = buildEvents({ name: "Levetiracetam", dosage: "500mg", times: ["08:00", "20:00"], days: [1, 2, 3, 4, 5, 6, 7], start_date: "2026-10-02", end_date: null, lead_minutes: 10 });
  assert.equal(ev.length, 2);
  assert.equal(ev[0].startsAt, "07:50");
  assert.equal(ev[1].startsAt, "19:50");
  assert.equal(ev[0].start.dateTime, "2026-10-02T07:50:00");
  assert.equal(ev[0].start.timeZone, "Asia/Ho_Chi_Minh");
  assert.equal(ev[0].recurrence[0], "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU");
  assert.deepEqual(ev[0].reminders.overrides, [{ method: "popup", minutes: 0 }]);
  assert.equal(ev[0].summary, "Levetiracetam 500mg");
});

test("calendar events: weekdays, end date and midnight edge", () => {
  const ev = buildEvents({ name: "A", dosage: null, times: ["00:05"], days: [3, 5], start_date: "2026-10-05", end_date: "2026-10-20", lead_minutes: 10 });
  assert.equal(ev[0].start.dateTime, "2026-10-07T00:00:00"); // first Wednesday; clamped at midnight, never the day before
  assert.match(ev[0].recurrence[0], /BYDAY=WE,FR;UNTIL=20261020T165959Z$/);
  assert.equal(untilUtc("2026-10-20"), "20261020T165959Z");
});
