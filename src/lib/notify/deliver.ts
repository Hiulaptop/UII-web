import { alertEmail } from "./templates.ts";
import type { Channel, AlertKind, Severity } from "./recipients";
import type { LiveEvent } from "./hub";

export type Row = { id: string; channel: Channel; recipientEmail: string | null };
export type AlertInfo = { id: string; type: AlertKind; severity: Severity; subjectName: string; detectedAt: string; heartRate: number | null };
export type Deps = {
  appUrl: string;
  mailReady: boolean;
  sendMail: (to: string, m: { subject: string; text: string; html: string }) => Promise<void>;
  publish: (e: LiveEvent) => number;
};
// 'retry' keeps the row pending so the next sweep tries again; the caller turns it into 'failed' once the alert is old.
export type Outcome = { status: "sent" | "delivered" | "failed" | "retry"; error?: string };

export async function deliver(row: Row, alert: AlertInfo, d: Deps): Promise<Outcome> {
  if (row.channel === "push") {
    // Recorded in-app either way (it shows in the notification list); "delivered" means an open page received it.
    const n = d.publish({ kind: "alert", alertId: alert.id, type: alert.type, severity: alert.severity, subject: alert.subjectName, at: alert.detectedAt });
    return { status: n > 0 ? "delivered" : "sent" };
  }
  if (row.channel === "sms") return { status: "failed", error: "sms_not_supported" };
  if (!d.mailReady) return { status: "failed", error: "mail_not_configured" };
  if (!row.recipientEmail) return { status: "failed", error: "no_email" };
  try {
    await d.sendMail(
      row.recipientEmail,
      alertEmail({
        subject: alert.subjectName,
        type: alert.type,
        severity: alert.severity,
        detectedAt: new Date(alert.detectedAt),
        heartRate: alert.heartRate,
        url: `${d.appUrl}/alerts/${alert.id}`,
      }),
    );
    return { status: "sent" };
  } catch (e) {
    // Only the error class/code: SMTP messages can echo the address or credentials.
    const code = (e as { code?: string })?.code;
    return { status: "retry", error: `smtp_${typeof code === "string" ? code.slice(0, 40) : "error"}` };
  }
}
