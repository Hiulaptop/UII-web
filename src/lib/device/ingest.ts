import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchPending } from "@/lib/notify/dispatch";
import { fanOutAlert } from "@/lib/notify/fanout";
import {
  defaultSeverity,
  sampleSchema,
  timestampOk,
  type AlertBody,
} from "./schemas";
import type { DeviceAuth } from "./auth";

export async function ingestSamples(device: DeviceAuth, rawSamples: unknown[], batteryPct?: number) {
  const now = Date.now();
  const rows: Record<string, unknown>[] = [];
  let rejected = 0;

  for (const raw of rawSamples) {
    const s = sampleSchema.safeParse(raw);
    if (!s.success || !timestampOk(s.data.t, now)) {
      rejected++;
      continue;
    }
    const d = s.data;
    rows.push({
      device_id: device.deviceId,
      recorded_at: new Date(d.t).toISOString(),
      heart_rate: d.hr ?? null,
      spo2: d.spo2 ?? null,
      temp_c: d.temp_c ?? null,
      accel_mag: d.accel_mean ?? null,
      accel_max: d.accel_max ?? null,
      accel_var: d.accel_var ?? null,
      steps: d.steps ?? null,
    });
  }

  const db = supabaseAdmin();
  if (rows.length) {
    // A retried batch is harmless: rows that already exist are skipped.
    const { error } = await db.from("sensor_samples").upsert(rows, { onConflict: "device_id,recorded_at", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  if (batteryPct !== undefined) {
    await db.from("devices").update({ battery_pct: batteryPct }).eq("id", device.deviceId);
  }
  return { accepted: rows.length, rejected };
}

export type AlertIngestResult = { ok: true; id: string; status: "created" | "duplicate" } | { ok: false; error: "bad_timestamp" };

export async function ingestAlert(device: DeviceAuth, body: AlertBody): Promise<AlertIngestResult> {
  if (!timestampOk(body.detected_at, Date.now())) return { ok: false, error: "bad_timestamp" };

  const db = supabaseAdmin();
  const severity = body.severity ?? defaultSeverity(body.type);
  const ins = await db
    .from("alerts")
    .insert({
      subject_id: device.userId,
      device_id: device.deviceId,
      type: body.type,
      severity,
      confidence: body.confidence ?? null,
      detected_at: new Date(body.detected_at).toISOString(),
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      metrics: body.metrics ? { heart_rate: body.metrics.heart_rate, accel_peak: body.metrics.accel_peak } : null,
      client_id: body.client_id,
      trigger: body.trigger,
    })
    .select("id")
    .single();

  if (ins.error) {
    // The watch retries until it gets an answer, so the same client_id can arrive twice: answer with the original.
    if (ins.error.code === "23505") {
      const existing = await db.from("alerts").select("id").eq("device_id", device.deviceId).eq("client_id", body.client_id).single();
      if (existing.error) throw new Error(existing.error.message);
      return { ok: true, id: existing.data.id as string, status: "duplicate" };
    }
    throw new Error(ins.error.message);
  }
  const id = ins.data.id as string;

  // Side effects must not undo or hide an alert that is already stored.
  if (body.snapshot) {
    const snap = await db.from("alert_snapshots").insert({
      alert_id: id,
      sample_rate_hz: body.snapshot.sample_rate_hz,
      started_at: new Date(body.snapshot.started_at).toISOString(),
      axes: body.snapshot.axes,
    });
    if (snap.error) console.error("[ingest] snapshot not stored:", snap.error.code);
  }
  try {
    await fanOutAlert({ id, subjectId: device.userId, type: body.type, severity });
    // Not awaited: the watch gets its answer now; delivery continues and the sweep retries anything that fails.
    void dispatchPending(id).catch((e) => console.error("[ingest] dispatch failed:", e instanceof Error ? e.name : typeof e));
  } catch (e) {
    console.error("[ingest] fan-out failed:", e instanceof Error ? e.name : typeof e);
  }
  return { ok: true, id, status: "created" };
}
