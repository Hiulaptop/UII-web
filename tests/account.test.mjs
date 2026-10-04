import test from "node:test";
import assert from "node:assert/strict";
import { confirmationMatches, exportFileName, stripSecrets } from "../src/lib/account/confirm.ts";

test("deleting an account needs the exact email, ignoring case and spaces", () => {
  assert.equal(confirmationMatches(" Me@X.com ", "me@x.com"), true);
  assert.equal(confirmationMatches("me@x.co", "me@x.com"), false);
  assert.equal(confirmationMatches("", ""), false);
  assert.equal(confirmationMatches(null, "me@x.com"), false);
  assert.equal(confirmationMatches(["me@x.com"], "me@x.com"), false);
});

test("export file name is dated in UTC and safe", () => {
  assert.equal(exportFileName(new Date(Date.UTC(2026, 0, 5, 23, 59))), "uii-du-lieu-2026-01-05.json");
});

test("secrets never survive in an export, however deep", () => {
  const out = stripSecrets({
    account: { email: "a@b.c", google_sub: "g-1" },
    devices: [{ name: "w", token_hash: "x", push_token: "y" }],
    sos_links: [{ id: 1, nested: { code_hash: "z", keep: true } }],
  });
  const text = JSON.stringify(out);
  for (const k of ["google_sub", "token_hash", "push_token", "code_hash"]) assert.ok(!text.includes(k), k);
  assert.equal(out.sos_links[0].nested.keep, true);
  assert.equal(out.account.email, "a@b.c");
});

import { createExistsCache } from "../src/lib/session-check.ts";

test("the session check queries once per window, notices deletion, and can be told to forget", async () => {
  let clock = 0, calls = 0, alive = true;
  const c = createExistsCache(async () => { calls++; return alive; }, 1000, () => clock);
  assert.equal(await c.exists("u"), true);
  assert.equal(await c.exists("u"), true);
  assert.equal(calls, 1, "second call is served from the cache");
  clock = 1500; alive = false;
  assert.equal(await c.exists("u"), false, "after the window the database is asked again");
  assert.equal(await c.exists("u"), false);
  assert.equal(calls, 3, "a missing user is never cached");
  alive = true; clock = 3000; await c.exists("v"); alive = false;
  c.forget("v");
  assert.equal(await c.exists("v"), false, "forgetting removes the shortcut");
});
