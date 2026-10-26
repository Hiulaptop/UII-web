import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AlertMapLazy } from "@/components/alerts/alert-map-lazy";
import { SiteHeader } from "@/components/dashboard/site-header";
import { Button } from "@/components/ui/button";
import { getAlertDetail } from "@/lib/alerts";
import { alertStatusLabel, alertTypeLabel, severityLabel, type AlertSeverity } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { alertAction } from "../actions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timeFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const secFmt = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

const severityClass: Record<AlertSeverity, string> = {
  low: "bg-fog text-steel",
  medium: "bg-mist text-graphite",
  high: "bg-ivory text-brass",
  critical: "bg-alarm text-graphite",
};
const eventLabel: Record<string, string> = {
  viewed: "đã xem",
  acknowledged: "đã xác nhận",
  escalated: "đã báo thêm",
  called_ems: "đã gọi cấp cứu",
  resolved: "đã đánh dấu xử lý xong",
  marked_false_alarm: "đã báo nhầm",
};
const triggerLabel: Record<string, string> = { device_event: "Đồng hồ phát hiện", manual: "Người đeo bấm tay", algorithm: "Thuật toán" };
const notifLabel: Record<string, string> = { pending: "Đang chờ gửi", sent: "Đã gửi", delivered: "Đã nhận", failed: "Gửi lỗi", read: "Đã đọc" };
const errors: Record<string, string> = {
  conflict: "Cảnh báo đã được người khác xử lý. Trang đã cập nhật.",
  forbidden: "Bạn chỉ có quyền xem cảnh báo này.",
  not_found: "Không tìm thấy cảnh báo.",
};
const h2 = "font-heading text-lg tracking-[-0.02em]";

function ActionButton({ id, action, children, variant }: { id: string; action: string; children: React.ReactNode; variant?: "outline" }) {
  return (
    <form action={alertAction}>
      <input type="hidden" name="alertId" value={id} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" variant={variant}>{children}</Button>
    </form>
  );
}

export default async function AlertDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/alerts/${id}`)}`);
  if (!UUID_RE.test(id)) notFound();

  const d = await getAlertDetail(id, session.user.id);
  if (!d) notFound();
  const { alert: a } = d;
  const active = a.status === "open" || a.status === "acknowledged";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={session.user.name} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] space-y-4 px-5 pt-6 pb-10">
          <Link href="/alerts" className="font-heading text-[16px] tracking-[-0.02em] text-slate">← Quay lại cảnh báo</Link>
          <div className="flex flex-wrap items-center gap-5 pt-2">
            <h1 className="font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">{alertTypeLabel[a.type]}</h1>
            <span className={cn("rounded-[20px] px-3 py-1 text-[13px] font-medium", severityClass[a.severity])}>{severityLabel[a.severity]}</span>
          </div>
          <p className="text-lg text-steel">
            {timeFmt.format(new Date(a.detected_at))} · {triggerLabel[a.trigger] ?? a.trigger}
            {a.device?.name && ` · ${a.device.name}`}
          </p>

          {error && <p role="alert" className="text-sm underline decoration-ember-orange decoration-1 underline-offset-[3px]">{errors[error] ?? "Không thực hiện được."}</p>}

          <div className="flex flex-col gap-5 rounded-[6px_0_0_0] bg-ivory p-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">{alertStatusLabel[a.status]}</p>
              <p className="max-w-xl text-sm text-steel">
                {active
                  ? d.canAct
                    ? "Xác nhận để mọi người biết bạn đã nhận tin, hoặc báo nhầm nếu không có sự cố."
                    : "Bạn chỉ có quyền xem cảnh báo này."
                  : "Cảnh báo đã được đóng."}
              </p>
            </div>
            {active && d.canAct && (
              <div className="flex flex-wrap gap-3">
                {a.status === "open" && <ActionButton id={a.id} action="acknowledge">Xác nhận</ActionButton>}
                <ActionButton id={a.id} action="resolve" variant="outline">Đã xử lý</ActionButton>
                <ActionButton id={a.id} action="false_alarm" variant="outline">Báo nhầm</ActionButton>
              </div>
            )}
          </div>
        </section>

        <section className="bg-ash py-[80px]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-5 px-5 lg:grid-cols-[1fr_400px]">
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-3">
                {[
                  { l: "Nhịp tim", v: a.metrics?.heart_rate != null ? `${a.metrics.heart_rate} bpm` : "—" },
                  { l: "Độ tin cậy", v: a.confidence != null ? `${Math.round(a.confidence * 100)}%` : "—" },
                  { l: "Phát hiện lúc", v: secFmt.format(new Date(a.detected_at)) },
                ].map((s) => (
                  <div key={s.l} className="rounded-[20px] bg-canvas-white p-8">
                    <p className="text-sm text-slate">{s.l}</p>
                    <p className="mt-3 font-heading text-[32px] leading-[1.19] tracking-[-0.02em]">{s.v}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 rounded-[20px] bg-canvas-white p-8 md:p-10">
                <h2 className={h2}>Vị trí</h2>
                {a.lat != null && a.lng != null ? (
                  <div className="space-y-3">
                    <AlertMapLazy
                      points={
                        d.locations.length
                          ? d.locations
                          : [{ t: a.located_at ?? a.detected_at, lat: a.lat, lng: a.lng, accuracy_m: a.accuracy_m }]
                      }
                    />
                    <p className="text-steel">
                      {a.lat.toFixed(5)}, {a.lng.toFixed(5)}
                      {a.accuracy_m != null && ` · sai số khoảng ${Math.round(a.accuracy_m)} m`}
                      {a.located_at && ` · cập nhật ${secFmt.format(new Date(a.located_at))}`} ·{" "}
                      <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noopener noreferrer" className="underline decoration-ember-orange decoration-1 underline-offset-[3px]">
                        Mở bằng ứng dụng bản đồ
                      </a>
                    </p>
                  </div>
                ) : (
                  <p className="text-steel">Đồng hồ không gửi kèm vị trí.</p>
                )}
                {d.hasSnapshot && <p className="text-sm text-slate">Có dữ liệu chuyển động quanh thời điểm cảnh báo (lưu để phân tích).</p>}
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-4 rounded-[20px] bg-canvas-white p-8 md:p-10">
                <h2 className={h2}>Dòng thời gian</h2>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <span className="mt-2 size-2.5 shrink-0 rounded-full bg-ember-orange" />
                    <div>
                      <p className="text-sm text-slate">{secFmt.format(new Date(a.detected_at))}</p>
                      <p>{triggerLabel[a.trigger] ?? "Phát hiện cảnh báo"}</p>
                    </div>
                  </li>
                  {d.events.map((e) => (
                    <li key={e.id} className="flex gap-3">
                      <span className="mt-2 size-2.5 shrink-0 rounded-full bg-graphite" />
                      <div>
                        <p className="text-sm text-slate">{secFmt.format(new Date(e.at))}</p>
                        <p>{e.user?.name ?? e.user?.email ?? "Ai đó"} {eventLabel[e.action] ?? e.action}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {d.notified.length > 0 && (
                <div className="space-y-3 rounded-[20px] bg-canvas-white p-8 md:p-10">
                  <h2 className={h2}>Đã thông báo</h2>
                  <ul className="divide-y divide-mist">
                    {d.notified.map((n) => (
                      <li key={n.id} className="flex justify-between gap-3 py-2.5">
                        <span>{n.recipient?.name ?? n.recipient?.email}</span>
                        <span className="text-sm text-slate">{notifLabel[n.status] ?? n.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
