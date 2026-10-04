#!/usr/bin/env node
// Stand-in for the Wear OS app: talks to the same HTTP API the real watch will use.
//
//   node scripts/watch-sim.mjs pair 4829-1375 [--url http://localhost:3000] [--name "Galaxy Watch"]
//   node scripts/watch-sim.mjs samples [--minutes 30] [--hr 72]
//   node scripts/watch-sim.mjs alert fall|seizure|pre_seizure [--manual] [--client-id ID] [--lat 10.77 --lng 106.70]
//   node scripts/watch-sim.mjs status
//
// The device token is kept in .watch-sim.json (git-ignored). It is never printed.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const STATE = ".watch-sim.json";
const [cmd, ...rest] = process.argv.slice(2);

function opts(args) {
  const o = { _: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const k = args[i].slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) o[k] = true;
      else { o[k] = next; i++; }
    } else o._.push(args[i]);
  }
  return o;
}
const o = opts(rest);
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
const base = String(o.url ?? process.env.WATCH_SIM_URL ?? state.url ?? "http://localhost:3000").replace(/\/$/, "");

async function call(path, body, token) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  return { status: res.status, data };
}

function needToken() {
  if (!state.token) { console.error("Not paired yet. Run: pair <code>"); process.exit(1); }
  return state.token;
}
const show = (label, r) => console.log(`${label}: HTTP ${r.status}`, r.data ? JSON.stringify(r.data) : "");

if (cmd === "pair") {
  const code = o._[0];
  if (!code) { console.error("Usage: pair <8-digit code>"); process.exit(1); }
  const r = await call("/api/device/pair", { code, name: o.name ?? "Simulated watch", model: "SIM-1", platform: "wearos" });
  if (r.status === 201) {
    writeFileSync(STATE, JSON.stringify({ url: base, token: r.data.token, device_id: r.data.device_id }, null, 2));
    console.log(`paired: HTTP 201 device_id=${r.data.device_id} (token saved to ${STATE})`);
  } else show("pair", r);
} else if (cmd === "samples") {
  const token = needToken();
  const minutes = Number(o.minutes ?? 30);
  const baseHr = Number(o.hr ?? 72);
  const windowMs = 10_000, count = Math.round((minutes * 60_000) / windowMs);
  const end = Date.now(), start = end - count * windowMs;
  const samples = Array.from({ length: count }, (_, i) => {
    const t = start + i * windowMs;
    const wave = Math.sin(t / 600_000);
    return { t, hr: Math.round((baseHr + 6 * wave + Math.random() * 3) * 10) / 10, accel_mean: 9.8 + Math.random() * 0.4, accel_max: 10.5 + Math.random() * 3, accel_var: Math.random() * 0.5, steps: Math.floor(Math.random() * 12) };
  });
  let accepted = 0, rejected = 0;
  for (let i = 0; i < samples.length; i += 720) {
    const r = await call("/api/device/samples", { samples: samples.slice(i, i + 720), battery_pct: 80 }, token);
    if (r.status !== 200) { show("samples", r); process.exit(1); }
    accepted += r.data.accepted; rejected += r.data.rejected;
  }
  console.log(`samples: sent ${count}, accepted ${accepted}, rejected ${rejected}`);
} else if (cmd === "alert") {
  const token = needToken();
  const type = o._[0];
  if (!["fall", "seizure", "pre_seizure"].includes(type)) { console.error("Usage: alert fall|seizure|pre_seizure"); process.exit(1); }
  const now = Date.now();
  const body = {
    client_id: typeof o["client-id"] === "string" ? o["client-id"] : `sim-${randomBytes(8).toString("hex")}`,
    type,
    trigger: o.manual ? "manual" : "device_event",
    detected_at: now,
    confidence: 0.9,
    metrics: { heart_rate: 118, accel_peak: 31.5 },
    // ten seconds of motion at 50 Hz around the event
    snapshot: { sample_rate_hz: 50, started_at: now - 5000, axes: Array.from({ length: 500 }, (_, i) => [Math.sin(i / 7), Math.cos(i / 9), 9.8 + (i > 250 && i < 275 ? 20 : 0)]) },
  };
  if (o.lat && o.lng) { body.lat = Number(o.lat); body.lng = Number(o.lng); }
  const r = await call("/api/device/alerts", body, token);
  show(`alert ${body.client_id}`, r);
} else if (cmd === "status") {
  console.log(state.token ? `paired to ${base} as device ${state.device_id}` : "not paired");
} else {
  console.log("Commands: pair <code> | samples | alert <type> | status");
}
