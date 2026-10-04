import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deliver, type AlertInfo, type Row } from "./deliver";
import { publish } from "./hub";
import { mailConfigured, sendMail } from "./mail";

// A failing mail server is retried by the sweep until the alert is this old, then the row is marked failed.
const RETRY_FOR_MS = 15 * 60_000;
const inFlight = new Set<string>();

type DbRow = {
  id: string;
  channel: Row["channel"];
  alert_id: string;
  users: { email: string | null; id: string } | null;
  alerts: {
    id: string; type: AlertInfo["type"]; severity: AlertInfo["severity"]; detected_at: string; created_at: string;
    metrics: { heart_rate?: number } | null; subject: { name: string | null; email: string } | null;
  } | null;
};

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

/** Sends every pending notification (of one alert, or all). Safe to call concurrently and repeatedly. */
export async function dispatchPending(alertId?: string): Promise<number> {
  const db = supabaseAdmin();
  let q = db
    .from("notifications")
    .select(
      "id, channel, alert_id, users:recipient_id(id, email), alerts!inner(id, type, severity, detected_at, created_at, metrics, subject:subject_id(name, email))",
    )
    .eq("status", "pending")
    .order("id")
    .limit(200);
  if (alertId) q = q.eq("alert_id", alertId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let done = 0;
  for (const r of data as unknown as DbRow[]) {
    if (!r.alerts || inFlight.has(r.id)) continue;
    inFlight.add(r.id);
    try {
      const a = r.alerts;
      const info: AlertInfo = {
        id: a.id, type: a.type, severity: a.severity, detectedAt: a.detected_at,
        subjectName: a.subject?.name || a.subject?.email.split("@")[0] || "",
        heartRate: a.metrics?.heart_rate ?? null,
      };
      const recipientId = r.users?.id;
      const out = await deliver({ id: r.id, channel: r.channel, recipientEmail: r.users?.email ?? null }, info, {
        appUrl: appUrl(),
        mailReady: mailConfigured(),
        sendMail,
        publish: (e) => (recipientId ? publish(recipientId, e) : 0),
      });
      const tooOld = Date.now() - Date.parse(a.created_at) > RETRY_FOR_MS;
      if (out.status === "retry" && !tooOld) {
        await db.from("notifications").update({ error: out.error }).eq("id", r.id);
        continue;
      }
      const status = out.status === "retry" ? "failed" : out.status;
      const upd = await db
        .from("notifications")
        .update({ status, error: out.error ?? null, sent_at: status === "failed" ? null : new Date().toISOString() })
        .eq("id", r.id)
        .eq("status", "pending");
      if (upd.error) console.error("[notify] status not saved:", upd.error.code);
      else done++;
    } catch (e) {
      console.error("[notify] dispatch failed:", e instanceof Error ? e.name : typeof e);
    } finally {
      inFlight.delete(r.id);
    }
  }
  return done;
}
