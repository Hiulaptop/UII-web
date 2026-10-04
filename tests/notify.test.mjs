import test from "node:test";
import assert from "node:assert/strict";
import { deliver } from "../src/lib/notify/deliver.ts";
import { alertEmail } from "../src/lib/notify/templates.ts";
import { connectionCount, publish, subscribe } from "../src/lib/notify/hub.ts";

const alert = { id: "a1", type: "fall", severity: "high", subjectName: "Lan", detectedAt: "2026-10-03T03:00:00Z", heartRate: 118.4 };
const mkDeps = (over = {}) => {
  const sent = [], events = [];
  return {
    sent, events,
    deps: { appUrl: "https://uii.studev.net", mailReady: true, sendMail: async (to, m) => { sent.push({ to, m }); }, publish: (e) => { events.push(e); return 0; }, ...over },
  };
};

test("email goes to the recipient with a link to the alert and no location", async () => {
  const { deps, sent } = mkDeps();
  const out = await deliver({ id: "n1", channel: "email", recipientEmail: "me@x.vn" }, alert, deps);
  assert.equal(out.status, "sent");
  assert.equal(sent[0].to, "me@x.vn");
  assert.match(sent[0].m.text, /https:\/\/uii\.studev\.net\/alerts\/a1/);
  assert.match(sent[0].m.subject, /Té ngã - Lan/);
  assert.match(sent[0].m.text, /118 bpm/);
  assert.doesNotMatch(sent[0].m.html + sent[0].m.text, /lat|lng|geo/i);
});

test("a failing mail server is retried, and only the error code is kept", async () => {
  const { deps } = mkDeps({ sendMail: async () => { throw Object.assign(new Error("535 secret@gmail.com password abc"), { code: "EAUTH" }); } });
  const out = await deliver({ id: "n1", channel: "email", recipientEmail: "me@x.vn" }, alert, deps);
  assert.deepEqual(out, { status: "retry", error: "smtp_EAUTH" });
});

test("email is a clean failure when mail is not configured or the recipient has no address", async () => {
  assert.deepEqual(await deliver({ id: "n", channel: "email", recipientEmail: "a@b.c" }, alert, mkDeps({ mailReady: false }).deps), { status: "failed", error: "mail_not_configured" });
  assert.deepEqual(await deliver({ id: "n", channel: "email", recipientEmail: null }, alert, mkDeps().deps), { status: "failed", error: "no_email" });
  assert.deepEqual(await deliver({ id: "n", channel: "sms", recipientEmail: "a@b.c" }, alert, mkDeps().deps), { status: "failed", error: "sms_not_supported" });
});

test("push is delivered when a page is open and merely recorded when none is", async () => {
  const open = mkDeps({ publish: (e) => { open.events.push(e); return 2; } });
  assert.equal((await deliver({ id: "n", channel: "push", recipientEmail: null }, alert, open.deps)).status, "delivered");
  assert.equal(open.events[0].kind, "alert");
  assert.equal(open.events[0].alertId, "a1");
  assert.equal((await deliver({ id: "n", channel: "push", recipientEmail: null }, alert, mkDeps().deps)).status, "sent");
});

test("names cannot inject headers or markup into the email", () => {
  const m = alertEmail({ subject: "Lan\r\nBcc: evil@x.com <script>", type: "seizure", severity: "critical", detectedAt: new Date(0), url: "https://u/alerts/1" });
  assert.doesNotMatch(m.subject, /[\r\n]/);
  assert.doesNotMatch(m.html, /<script>/);
  assert.match(m.html, /&lt;script&gt;/);
});

test("the hub delivers only to the addressed user and stops after unsubscribe", () => {
  const got = [];
  const off = subscribe("u1", (e) => got.push(e));
  assert.equal(publish("u2", { kind: "alert_updated", alertId: "x", status: "open" }), 0);
  assert.equal(publish("u1", { kind: "alert_updated", alertId: "x", status: "open" }), 1);
  assert.equal(got.length, 1);
  off();
  assert.equal(connectionCount("u1"), 0);
  assert.equal(publish("u1", { kind: "alert_updated", alertId: "x", status: "open" }), 0);
});

test("a throwing listener is dropped without affecting others", () => {
  const got = [];
  const off1 = subscribe("u3", () => { throw new Error("closed"); });
  const off2 = subscribe("u3", (e) => got.push(e));
  assert.equal(publish("u3", { kind: "alert_updated", alertId: "x", status: "open" }), 1);
  assert.equal(connectionCount("u3"), 1);
  off1(); off2();
});

import { parsePrefsForm } from "../src/lib/notify/prefs-schema.ts";
const form = (o) => ({ getAll: (k) => [].concat(o[k] ?? []), get: (k) => (Array.isArray(o[k]) ? o[k][0] : o[k] ?? null) });

test("preferences form: valid input passes, sms and empty selections are rejected", () => {
  const ok = parsePrefsForm(form({ channels: ["push", "email"], types: ["fall"], min_severity: "high", quiet_start: "22:00", quiet_end: "06:30" }));
  assert.equal(ok.success, true);
  assert.equal(ok.data.quiet_start, "22:00");
  assert.equal(parsePrefsForm(form({ channels: ["sms"], types: ["fall"], min_severity: "low" })).success, false);
  assert.equal(parsePrefsForm(form({ channels: [], types: ["fall"], min_severity: "low" })).success, false);
  assert.equal(parsePrefsForm(form({ channels: ["push"], types: [], min_severity: "low" })).success, false);
  assert.equal(parsePrefsForm(form({ channels: ["push"], types: ["fall"], min_severity: "extreme" })).success, false);
});

test("preferences form: quiet hours need both ends and a real time; blank means none", () => {
  const base = { channels: ["push"], types: ["fall"], min_severity: "low" };
  assert.equal(parsePrefsForm(form({ ...base, quiet_start: "22:00" })).success, false);
  assert.equal(parsePrefsForm(form({ ...base, quiet_start: "25:00", quiet_end: "06:00" })).success, false);
  const none = parsePrefsForm(form({ ...base, quiet_start: "", quiet_end: "" }));
  assert.equal(none.success, true);
  assert.equal(none.data.quiet_start, null);
});
