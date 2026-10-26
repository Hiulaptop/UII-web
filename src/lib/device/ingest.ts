import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchPending } from "@/lib/notify/dispatch";
import { fanOutAlert } from "@/lib/notify/fanout";
import {
  defaultSeverity,
  sampleSchema,
  timestampOk,
  LOCATION_WINDOW_MS,
  MAX_LOCATIONS_PER_ALERT,
  type AlertBody,
  type LocationBody,
} from "./schemas";
import { isBetterFix } from "./location-rule";
import { publishToCircle } from "@/lib/notify/audience";
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
      accuracy_m: body.lat !== undefined ? (body.accuracy_m ?? null) : null,
      located_at: body.lat !== undefined ? new Date(body.fix_time ?? body.detected_at).toISOString() : null,
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
  if (body.lat !== undefined && body.lng !== undefined) {
    const first = await db.from("alert_locations").insert({
      alert_id: id,
      t: new Date(body.fix_time ?? body.detected_at).toISOString(),
      lat: body.lat,
      lng: body.lng,
      accuracy_m: body.accuracy_m ?? null,
    });
    if (first.error) console.error("[ingest] first location not stored:", first.error.code);
  }
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

export type LocationIngestResult = { ok: true; status: "stored" | "ignored" } | { ok: false; error: "not_found" | "bad_timestamp" };

// A later fix of an alert this device sent. Anything past the cap or the incident window is ignored with success, so the
// watch drops it instead of retrying forever.
export async function ingestLocation(device: DeviceAuth, body: LocationBody): Promise<LocationIngestResult> {
  const now = Date.now();
  if (!timestampOk(body.fix_time, now)) return { ok: false, error: "bad_timestamp" };

  const db = supabaseAdmin();
  const found = await db
    .from("alerts")
    .select("id, subject_id, status, detected_at, accuracy_m, located_at")
    .eq("device_id", device.deviceId)
    .eq("client_id", body.client_id)
    .maybeSingle();
  if (found.error) throw new Error(found.error.message);
  if (!found.data) return { ok: false, error: "not_found" };
  const alert = found.data;

  if (body.fix_time - Date.parse(alert.detected_at as string) > LOCATION_WINDOW_MS) return { ok: true, status: "ignored" };

  const count = await db.from("alert_locations").select("id", { count: "exact", head: true }).eq("alert_id", alert.id);
  if (count.error) throw new Error(count.error.message);
  if ((count.count ?? 0) >= MAX_LOCATIONS_PER_ALERT) return { ok: true, status: "ignored" };

  const ins = await db.from("alert_locations").insert({
    alert_id: alert.id,
    t: new Date(body.fix_time).toISOString(),
    lat: body.lat,
    lng: body.lng,
    accuracy_m: body.accuracy_m ?? null,
  });
  // The watch retries until it gets an answer: the same fix twice is the same fix.
  if (ins.error) {
    if (ins.error.code === "23505") return { ok: true, status: "ignored" };
    throw new Error(ins.error.message);
  }

  const current = alert.located_at ? { t: Date.parse(alert.located_at as string), accuracy: (alert.accuracy_m as number | null) ?? null } : null;
  if (isBetterFix({ t: body.fix_time, accuracy: body.accuracy_m ?? null }, current)) {
    const upd = await db
      .from("alerts")
      .update({ lat: body.lat, lng: body.lng, accuracy_m: body.accuracy_m ?? null, located_at: new Date(body.fix_time).toISOString() })
      .eq("id", alert.id);
    if (upd.error) throw new Error(upd.error.message);
  }
  publishToCircle(alert.subject_id as string, { kind: "alert_updated", alertId: alert.id as string, status: alert.status as string }).catch(() => {});
  return { ok: true, status: "stored" };
}
