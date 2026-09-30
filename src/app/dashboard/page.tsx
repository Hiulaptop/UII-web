import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { HeartRateChart } from "@/components/dashboard/heart-rate-chart";
import { SiteHeader } from "@/components/dashboard/site-header";
import { getDashboard, HEART_RATE_THRESHOLD } from "@/lib/dashboard";
import {
  alertStatusLabel,
  alertTypeLabel,
  circleRoleLabel,
  memberStatusLabel,
  severityLabel,
  type AlertSeverity,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

const timeFmt = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});
const relFmt = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });

function timeAgo(iso: string) {
  const sec = Math.round((Date.parse(iso) - Date.now()) / 1000);
  const abs = Math.abs(sec);
  if (abs < 60) return relFmt.format(sec, "second");
  if (abs < 3600) return relFmt.format(Math.round(sec / 60), "minute");
  if (abs < 86400) return relFmt.format(Math.round(sec / 3600), "hour");
  return relFmt.format(Math.round(sec / 86400), "day");
}

function place(a: { lat: number | null; lng: number | null }) {
  return a.lat != null && a.lng != null ? `${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}` : "Không rõ vị trí";
}

const severityClass: Record<AlertSeverity, string> = {
  low: "bg-fog text-steel",
  medium: "bg-mist text-graphite",
  high: "bg-ivory text-brass",
  critical: "bg-graphite text-white",
};

const h2 = "font-heading text-[32px] leading-[1.19] tracking-[-0.02em]";
const featureCard = "scroll-mt-5 rounded-[6px_0_0_0] bg-canvas-white p-8 md:pt-[70px] md:pl-[60px] md:pr-10 md:pb-10";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const d = await getDashboard(session.user.id);
  const firstName = session.user.name?.split(" ").at(-1) ?? "bạn";
  const subjectName = d.profile?.full_name ?? d.subject.name ?? d.subject.email;
  const hr = d.heartRate;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={session.user.name} />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-[80px]">
          <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">
            {d.isSelf ? "Hồ sơ của bạn" : `Đang giám sát ${subjectName}`}
          </p>
          <h1 className="mt-5 max-w-3xl font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">
            {d.device ? `Chào ${firstName}, mọi thứ đang được theo dõi.` : `Chào ${firstName}, hãy ghép nối đồng hồ.`}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-[1.25] text-steel">
            {d.device
              ? [
                  d.device.name ?? d.device.model ?? "Thiết bị",
                  d.device.battery_pct != null && `pin ${d.device.battery_pct}%`,
                  d.device.last_seen_at && `cập nhật ${timeAgo(d.device.last_seen_at)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Chưa có thiết bị nào. Cài ứng dụng UII trên đồng hồ Wear OS để bắt đầu nhận cảnh báo."}
          </p>

          {d.openAlert && (
            <div
              role="alert"
              className="mt-10 flex flex-col gap-5 rounded-[6px_0_0_0] bg-ivory p-8 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">Cảnh báo đang mở</p>
                <p className="mt-2 font-heading text-[32px] leading-[1.19] tracking-[-0.02em]">
                  {alertTypeLabel[d.openAlert.type]}
                  {d.openAlert.metrics?.heart_rate != null && (
                    <>
                      {" "}
                      <span className="underline decoration-ember-orange decoration-1 underline-offset-[6px]">
                        {d.openAlert.metrics.heart_rate} bpm
                      </span>
                    </>
                  )}
                </p>
                <p className="mt-2 text-sm text-steel">
                  {timeFmt.format(new Date(d.openAlert.detected_at))} · {place(d.openAlert)}
                </p>
              </div>
              <div className="flex gap-3">
                <Button>Xác nhận</Button>
                {d.contact && (
                  <a
                    href={`tel:${d.contact.phone.replace(/\s/g, "")}`}
                    className="inline-flex h-11 items-center border border-graphite px-5 font-heading tracking-[-0.02em] hover:bg-ash"
                  >
                    Gọi {d.contact.relation ?? d.contact.name}
                  </a>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Stats + chart */}
        <section className="bg-ash py-[80px]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-5 px-5 md:grid-cols-4">
            {[
              { label: "Cảnh báo 7 ngày", value: d.stats.alerts7d },
              { label: "Đang mở", value: d.stats.openAlerts },
              { label: "Phản hồi trung bình", value: d.stats.avgResponseSec != null ? `${d.stats.avgResponseSec}s` : "—" },
              { label: "Thành viên circle", value: d.stats.circleMembers },
            ].map((s) => (
              <div key={s.label} className="rounded-[20px] bg-canvas-white p-8">
                <p className="text-sm text-slate">{s.label}</p>
                <p className="mt-3 font-heading text-[40px] leading-[1.2] tracking-[-0.02em]">{s.value}</p>
              </div>
            ))}

            <div className="rounded-[20px] bg-canvas-white p-8 md:col-span-4 md:p-10">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-heading text-lg tracking-[-0.02em]">Nhịp tim 24 giờ</h2>
                {hr.length > 1 && (
                  <p className="text-sm text-slate">
                    Gần nhất <span className="text-graphite">{hr.at(-1)} bpm</span> · cao nhất{" "}
                    <span className="text-graphite">{Math.max(...hr)} bpm</span> · ngưỡng {HEART_RATE_THRESHOLD} bpm
                  </p>
                )}
              </div>
              <div className="mt-5">
                {hr.length > 1 ? (
                  <HeartRateChart values={hr} threshold={HEART_RATE_THRESHOLD} />
                ) : (
                  <p className="flex h-40 items-center justify-center text-sm text-slate">
                    Chưa có dữ liệu nhịp tim trong 24 giờ qua.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Alerts */}
        <section id="alerts" className="mx-auto w-full max-w-[1200px] scroll-mt-5 px-5 py-[80px]">
          <h2 className={h2}>Cảnh báo gần đây</h2>
          {d.alerts.length ? (
            <ul className="mt-10 divide-y divide-mist border-y border-mist">
              {d.alerts.map((a) => (
                <li key={a.id} className="grid gap-2 py-5 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center md:gap-5">
                  <div>
                    <p className="font-heading text-lg tracking-[-0.02em]">{alertTypeLabel[a.type]}</p>
                    <p className="text-sm text-slate">{place(a)}</p>
                  </div>
                  <p className="text-sm text-steel">{timeFmt.format(new Date(a.detected_at))}</p>
                  <p className="text-sm text-steel">
                    {a.metrics?.heart_rate != null && `${a.metrics.heart_rate} bpm · `}
                    {alertStatusLabel[a.status]}
                  </p>
                  <span className={cn("w-fit rounded-[20px] px-3 py-1 text-[13px] font-medium", severityClass[a.severity])}>
                    {severityLabel[a.severity]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-10 border-y border-mist py-10 text-steel">Chưa có cảnh báo nào.</p>
          )}
        </section>

        {/* SOS + Circle */}
        <section className="bg-ash py-[80px]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-5 px-5 lg:grid-cols-2">
            <div id="sos" className={featureCard}>
              <h2 className={h2}>Hồ sơ SOS</h2>
              <p className="mt-3 text-sm text-steel">Hiển thị cho đội cấp cứu khi có tình huống nguy kịch.</p>
              {d.profile ? (
                <dl className="mt-10 grid grid-cols-2 gap-5 text-sm">
                  <div>
                    <dt className="text-slate">Nhóm máu</dt>
                    <dd className="mt-1 font-heading text-[32px] tracking-[-0.02em]">{d.profile.blood_type ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate">Chẩn đoán</dt>
                    <dd className="mt-1 text-graphite">{d.profile.epilepsy_type ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate">Thuốc đang dùng</dt>
                    <dd className="mt-1 text-graphite">
                      {d.medications.length
                        ? d.medications.map((m) => [m.name, m.dosage, m.schedule].filter(Boolean).join(" · ")).join("; ")
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate">Dị ứng</dt>
                    <dd className="mt-1 text-graphite">{d.profile.allergies.length ? d.profile.allergies.join(", ") : "Không"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate">Liên hệ khẩn cấp</dt>
                    <dd className="mt-1 text-graphite">
                      {d.contact ? (
                        <>
                          {d.contact.name}
                          {d.contact.relation && ` (${d.contact.relation})`} ·{" "}
                          <a
                            href={`tel:${d.contact.phone.replace(/\s/g, "")}`}
                            className="underline decoration-ember-orange decoration-1 underline-offset-[3px]"
                          >
                            {d.contact.phone}
                          </a>
                        </>
                      ) : (
                        "Chưa có"
                      )}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-10 text-steel">
                  Chưa có hồ sơ. Thêm nhóm máu, thuốc và người liên hệ để đội cấp cứu xử trí nhanh hơn.
                </p>
              )}
              {d.isSelf && (
                <div className="mt-10 flex flex-wrap gap-3">
                  <Button variant="outline">{d.profile ? "Chỉnh sửa hồ sơ" : "Tạo hồ sơ SOS"}</Button>
                  {d.profile && <Button variant="ghost">Tạo mã QR SOS</Button>}
                </div>
              )}
            </div>

            <div id="circle" className={featureCard}>
              <h2 className={h2}>Circle</h2>
              <p className="mt-3 text-sm text-steel">Người thân nhận cảnh báo ngay khi có sự cố.</p>
              {d.members.length ? (
                <ul className="mt-10 divide-y divide-mist">
                  {d.members.map((m) => {
                    const name = m.users?.name ?? m.users?.email ?? "Không rõ";
                    return (
                      <li key={m.user_id} className="flex items-center justify-between gap-5 py-4">
                        <div className="flex items-center gap-3">
                          <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-ash font-heading text-sm">
                            {name.split(" ").at(-1)?.[0]?.toUpperCase()}
                          </span>
                          <div>
                            <p className="text-graphite">{name}</p>
                            <p className="text-sm text-slate">{circleRoleLabel[m.role]}</p>
                          </div>
                        </div>
                        <span className="text-[13px] text-slate">{memberStatusLabel[m.status]}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-10 text-steel">Chưa có ai trong circle.</p>
              )}
              {d.isSelf && (
                <div className="mt-10">
                  <Button>Mời người thân</Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-[1200px] px-5 py-10 font-heading text-[13px] tracking-[-0.02em] text-slate">
        UII · Giám sát động kinh
      </footer>
    </div>
  );
}
