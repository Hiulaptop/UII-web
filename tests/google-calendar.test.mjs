import test from "node:test";
import assert from "node:assert/strict";
import { checkState, decryptSecret, emailFromIdToken, encryptSecret, makeState } from "../src/lib/google/secrets.ts";
import { removeScheduleEvents, syncSchedule } from "../src/lib/medication/calendar-sync.ts";

const SECRET = "test-secret-test-secret-123456";

test("the refresh token round-trips and is useless without the secret", () => {
  const blob = encryptSecret("1//refresh-token-value", SECRET);
  assert.ok(!blob.includes("refresh-token-value"));
  assert.match(blob, /^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
  assert.equal(decryptSecret(blob, SECRET), "1//refresh-token-value");
  assert.throws(() => decryptSecret(blob, SECRET + "x"));
  assert.notEqual(encryptSecret("same", SECRET), encryptSecret("same", SECRET), "a fresh IV every time");
});

test("a tampered or malformed secret is refused", () => {
  const blob = encryptSecret("abc", SECRET).split(".");
  blob[3] = Buffer.from("zzzz").toString("base64url");
  assert.throws(() => decryptSecret(blob.join("."), SECRET));
  assert.throws(() => decryptSecret("nonsense", SECRET));
});

test("the OAuth state binds to the user, expires, and cannot be forged", () => {
  const now = 1_000_000;
  const st = makeState("user-1", SECRET, now);
  assert.equal(checkState(st, "user-1", SECRET, now + 1000), true);
  assert.equal(checkState(st, "user-2", SECRET, now + 1000), false, "another user's session");
  assert.equal(checkState(st, "user-1", SECRET, now + 11 * 60_000), false, "expired");
  assert.equal(checkState(st, "user-1", SECRET + "x", now + 1000), false, "wrong secret");
  assert.equal(checkState(st.slice(0, -2) + "AA", "user-1", SECRET, now + 1000), false, "altered signature");
  assert.equal(checkState(null, "user-1", SECRET), false);
  assert.equal(checkState("a.b.c", "user-1", SECRET), false);
});

test("the e-mail comes from the id_token and nothing else is trusted", () => {
  const body = Buffer.from(JSON.stringify({ email: "me@x.vn", sub: "1" })).toString("base64url");
  assert.equal(emailFromIdToken(`h.${body}.s`), "me@x.vn");
  assert.equal(emailFromIdToken("garbage"), null);
  assert.equal(emailFromIdToken(undefined), null);
});

function fakeGateway() {
  const calls = [];
  let n = 0;
  return {
    calls,
    async ensureCalendar(id) { calls.push(["ensure", id]); return id ?? "cal-1"; },
    async upsertEvent(cal, ev, id) { calls.push(["upsert", ev.key, id ?? null]); return id ?? `ev-${++n}`; },
    async deleteEvent(cal, id) { calls.push(["delete", id]); },
    async deleteCalendar(id) { calls.push(["deleteCalendar", id]); },
  };
}
const sched = { name: "Keppra", dosage: "500mg", times: ["08:00", "20:00"], days: [1, 2, 3, 4, 5, 6, 7], start_date: "2026-10-02", end_date: null, lead_minutes: 10, remind: true };

test("sync creates one event per time and returns their ids", async () => {
  const gw = fakeGateway();
  const ids = await syncSchedule(gw, "cal-1", sched, {});
  assert.deepEqual(ids, { "08:00": "ev-1", "20:00": "ev-2" });
  assert.deepEqual(gw.calls.map((c) => c[0]), ["upsert", "upsert"]);
});

test("sync updates existing events in place and deletes the ones whose time was removed", async () => {
  const gw = fakeGateway();
  const ids = await syncSchedule(gw, "cal-1", { ...sched, times: ["08:00", "12:00"] }, { "08:00": "ev-a", "20:00": "ev-b" });
  assert.deepEqual(gw.calls, [["delete", "ev-b"], ["upsert", "08:00", "ev-a"], ["upsert", "12:00", null]]);
  assert.equal(ids["08:00"], "ev-a");
  assert.ok(!("20:00" in ids));
});

test("switching reminders off removes every event and stores none", async () => {
  const gw = fakeGateway();
  const ids = await syncSchedule(gw, "cal-1", { ...sched, remind: false }, { "08:00": "ev-a", "20:00": "ev-b" });
  assert.deepEqual(ids, {});
  assert.deepEqual(gw.calls, [["delete", "ev-a"], ["delete", "ev-b"]]);
});

test("a failure half way reports the events already created, so a retry does not duplicate them", async () => {
  const gw = fakeGateway();
  gw.upsertEvent = async (cal, ev) => { if (ev.key === "20:00") throw new Error("boom"); return "ev-1"; };
  await assert.rejects(syncSchedule(gw, "cal-1", sched, { "20:00": "old" }), (e) => {
    assert.match(e.message, /boom/);
    assert.deepEqual(e.partialIds, { "20:00": "old", "08:00": "ev-1" });
    return true;
  });
});

test("removing a schedule deletes all of its events", async () => {
  const gw = fakeGateway();
  await removeScheduleEvents(gw, "cal-1", { "08:00": "ev-a", "20:00": "ev-b" });
  assert.deepEqual(gw.calls, [["delete", "ev-a"], ["delete", "ev-b"]]);
});
