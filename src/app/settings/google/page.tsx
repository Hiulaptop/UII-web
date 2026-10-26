import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dashboard/site-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { getConnection } from "@/lib/google/connection";
import { CALENDAR_NAME } from "@/lib/medication/calendar-events";
import { listSchedules } from "@/lib/medication/service";
import { disconnectAction, resyncAction } from "./actions";

const card = "rounded-[20px] bg-canvas-white p-8 md:p-10";

function ago(iso: string | null) {
  if (!iso) return "chưa lần nào";
  const sec = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (sec < 60) return "vừa xong";
  if (sec < 3600) return `${Math.round(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.round(sec / 3600)} giờ trước`;
  return `${Math.round(sec / 86400)} ngày trước`;
}

const NOTICE: Record<string, { text: string; tone: "ok" | "warn" }> = {
  connected: { text: "Đã kết nối Google Calendar.", tone: "ok" },
  denied: { text: "Bạn chưa cấp quyền lịch nên UII chưa kết nối được.", tone: "warn" },
  invalid: { text: "Phiên kết nối đã hết hạn, hãy thử lại.", tone: "warn" },
  failed: { text: "Không kết nối được Google Calendar, hãy thử lại sau.", tone: "warn" },
};

export default async function GoogleSettingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fsettings%2Fgoogle");
  const uid = session.user.id;
  const { status } = await searchParams;
  const [connection, schedules] = await Promise.all([getConnection(uid), listSchedules(uid)]);
  const events = schedules.filter((s) => s.remind).reduce((n, s) => n + s.times.length, 0);
  const notice = status ? NOTICE[status] : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={session.user.name} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
          <Link href="/settings" className="text-sm text-brass hover:text-graphite">← Cài đặt</Link>
          <h1 className="mt-5 font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">Kết nối Google</h1>
          <p className="mt-5 max-w-xl text-lg leading-[1.25] text-steel">Chọn dịch vụ Google UII được dùng. Bạn thu hồi được bất cứ lúc nào.</p>
        </section>

        <section className="bg-ash py-[60px]">
          <div className="mx-auto w-full max-w-[860px] space-y-5 px-5">
            {notice && (
              <p role="status" className={`rounded-[12px] px-5 py-3 text-sm ${notice.tone === "ok" ? "bg-ivory" : "bg-canvas-white text-emergency"}`}>{notice.text}</p>
            )}

            <div className={card}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-heading text-lg tracking-[-0.02em]">Google Calendar · nhắc uống thuốc</h2>
                <span className={`flex shrink-0 items-center gap-2 rounded-[20px] px-3 py-1 text-sm ${connection ? "bg-ivory" : "bg-fog"}`}>
                  <span className={`size-2 rounded-full ${connection ? "bg-ember-orange" : "bg-slate"}`} />
                  {connection ? "Đã kết nối" : "Chưa kết nối"}
                </span>
              </div>
              <p className="mt-4 text-sm text-steel">
                UII tạo một lịch riêng tên &ldquo;{CALENDAR_NAME}&rdquo; trong tài khoản Google của bạn và đặt nhắc ở đó. Lịch tự đồng bộ xuống điện thoại và đồng hồ.
              </p>

              {connection && (
                <dl className="mt-6 divide-y divide-mist border-y border-mist text-sm">
                  {[
                    ["Tài khoản", connection.providerEmail ?? "—"],
                    ["Lịch", CALENDAR_NAME],
                    ["Sự kiện đã tạo", `${events} sự kiện lặp`],
                    ["Đồng bộ lần cuối", ago(connection.lastSyncAt)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-slate">{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
              )}

              {connection?.lastError && (
                <p role="alert" className="mt-4 text-sm text-emergency">
                  {connection.lastError === "reconnect"
                    ? "Google không còn cho UII truy cập. Hãy ngắt kết nối rồi kết nối lại."
                    : "Lần đồng bộ gần nhất bị lỗi. Bấm “Đồng bộ lại” để thử lần nữa."}
                </p>
              )}

              <div className="mt-6 bg-ivory p-5 text-sm">
                <p className="text-[13px] text-brass">UII được phép</p>
                <ul className="mt-2 space-y-1 text-steel">
                  <li>· Tạo và sửa sự kiện trong lịch &ldquo;{CALENDAR_NAME}&rdquo;</li>
                  <li>· Không đọc các lịch khác của bạn</li>
                </ul>
              </div>

              {connection ? (
                <div className="mt-6 space-y-4">
                  <form action={disconnectAction} className="space-y-4">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" name="delete_calendar" defaultChecked className="size-4 accent-graphite" />
                      Ngắt kết nối cũng xóa lịch &ldquo;{CALENDAR_NAME}&rdquo; và các nhắc trong đó
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <Button type="submit" variant="outline" formAction={resyncAction}>Đồng bộ lại</Button>
                      <Button type="submit" variant="outline">Ngắt kết nối</Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="mt-6">
                  <a href="/api/google/calendar/connect" className={buttonVariants()}>Kết nối Google Calendar</a>
                </div>
              )}
            </div>

            <div className={card}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-heading text-lg tracking-[-0.02em]">Email cảnh báo</h2>
                <span className="flex shrink-0 items-center gap-2 rounded-[20px] bg-fog px-3 py-1 text-sm"><span className="size-2 rounded-full bg-slate" />Do UII gửi</span>
              </div>
              <p className="mt-4 text-sm text-steel">
                Email cảnh báo được gửi từ địa chỉ hệ thống của UII tới người thân trong circle. Bạn không cần kết nối Gmail của mình, và người thân không thấy địa chỉ email của nhau.
              </p>
              <Link href="/circle/notifications" className="mt-4 inline-block underline decoration-ember-orange decoration-1 underline-offset-[3px]">
                Chọn ai nhận email ở Circle → Thông báo
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
