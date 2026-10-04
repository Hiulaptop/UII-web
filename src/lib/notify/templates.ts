import type { AlertKind, Severity } from "./recipients";

const TYPE: Record<AlertKind, string> = { pre_seizure: "Dấu hiệu tiền động kinh", fall: "Té ngã", seizure: "Nghi co giật" };
const SEVERITY: Record<Severity, string> = { low: "thấp", medium: "trung bình", high: "cao", critical: "nguy kịch" };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
// Names come from Google profiles; keep them out of header injection and cap their length.
const oneLine = (s: string) => s.replace(/[\r\n\u2028\u2029]+/g, " ").trim().slice(0, 80);

export type AlertMail = {
  subject: string;
  type: AlertKind;
  severity: Severity;
  detectedAt: Date;
  heartRate?: number | null;
  url: string;
};

const timeFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });

// No coordinates, no medical history: an email can sit in an inbox for years. The details are behind the login.
export function alertEmail(a: AlertMail): { subject: string; text: string; html: string } {
  const who = oneLine(a.subject) || "Người thân của bạn";
  const what = TYPE[a.type];
  const when = timeFmt.format(a.detectedAt);
  const hr = a.heartRate ? `Nhịp tim lúc đó: ${Math.round(a.heartRate)} bpm.` : "";
  const subject = `[UII] ${what} - ${who}`;
  const lines = [`${who}: ${what.toLowerCase()} (mức ${SEVERITY[a.severity]}) lúc ${when}.`, hr].filter(Boolean);
  const text = `${lines.join("\n")}\n\nXem chi tiết và xác nhận đã nhận: ${a.url}\n\nNếu đây là tình huống khẩn cấp, hãy gọi người thân hoặc 115 ngay.`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#1a1a1a;max-width:480px">
<p style="font-size:18px;margin:0 0 12px"><strong>${esc(who)}</strong>: ${esc(what.toLowerCase())}</p>
<p style="margin:0 0 4px">Mức ${esc(SEVERITY[a.severity])} · ${esc(when)}</p>
${hr ? `<p style="margin:0 0 4px">${esc(hr)}</p>` : ""}
<p style="margin:20px 0"><a href="${esc(a.url)}" style="background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none">Xem chi tiết</a></p>
<p style="color:#666;font-size:13px">Nếu đây là tình huống khẩn cấp, hãy gọi người thân hoặc 115 ngay.</p></div>`;
  return { subject, text, html };
}
