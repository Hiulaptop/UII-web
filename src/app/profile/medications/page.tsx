import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dashboard/site-header";
import { ScheduleForm } from "@/components/medication/schedule-form";
import { Button } from "@/components/ui/button";
import { getConnection } from "@/lib/google/connection";
import { daysSummary, vnDate } from "@/lib/medication/schedule";
import { getSchedule, listSchedules, listToday } from "@/lib/medication/service";
import { deleteScheduleAction, markTakenAction } from "./actions";

const timeFmt = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

export default async function MedicationsPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string; sync?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fprofile%2Fmedications");
  const uid = session.user.id;
  const { edit, new: isNew, sync } = await searchParams;

  const [schedules, today, connection] = await Promise.all([listSchedules(uid), listToday(uid), getConnection(uid)]);
  const editing = edit && /^[0-9a-f-]{36}$/i.test(edit) ? await getSchedule(uid, edit) : null;
  const showForm = Boolean(editing) || isNew === "1" || schedules.length === 0;
  const now = new Date();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={session.user.name} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
          <Link href="/profile" className="text-sm text-brass hover:text-graphite">← Hồ sơ SOS · Thuốc đang dùng</Link>
          <h1 className="mt-5 font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">Lịch uống thuốc</h1>
          <p className="mt-5 max-w-xl text-lg leading-[1.25] text-steel">
            Đặt giờ uống và nhận nhắc qua Google Calendar. Bấm &ldquo;Đã uống&rdquo; để theo dõi tuân thủ.
          </p>
        </section>

        <section className="bg-ash py-[60px]">
          <div className="mx-auto w-full max-w-[1200px] space-y-5 px-5">
            {sync === "failed" && (
              <p role="alert" className="rounded-[12px] bg-canvas-white px-5 py-3 text-sm text-red-700">
                Đã lưu lịch, nhưng chưa đồng bộ được Google Calendar. <Link href="/settings/google" className="underline">Xem kết nối</Link>
              </p>
            )}
            {showForm ? (
              <ScheduleForm key={editing?.id ?? "new"} initial={editing} today={vnDate(now.getTime())} calendarConnected={Boolean(connection)} />
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[20px] bg-canvas-white p-8 md:p-10">
                <h2 className="font-heading text-lg tracking-[-0.02em]">Hôm nay</h2>
                <p className="mt-2 text-sm text-slate">Theo dõi tuân thủ cho báo cáo sức khỏe</p>
                {today.doses.length ? (
                  <ul className="mt-4 divide-y divide-mist">
                    {today.doses.map((d) => (
                      <li key={`${d.scheduleId}-${d.time}`} className="flex items-center justify-between gap-4 py-4">
                        <div>
                          <p>{d.time} · {d.label}</p>
                          <p className="text-sm text-slate">
                            {d.takenAt ? `✓ Đã uống lúc ${timeFmt.format(new Date(d.takenAt))}` : Date.parse(d.scheduledFor) > now.getTime() ? "Chưa đến giờ" : "Chưa ghi nhận"}
                          </p>
                        </div>
                        {!d.takenAt && (
                          <form action={markTakenAction}>
                            <input type="hidden" name="id" value={d.scheduleId} />
                            <input type="hidden" name="time" value={d.time} />
                            <Button type="submit" size="sm">Đã uống</Button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-steel">Hôm nay không có liều nào.</p>
                )}
              </div>

              <div className="rounded-[20px] bg-canvas-white p-8 md:p-10">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-heading text-lg tracking-[-0.02em]">Các lịch thuốc ({schedules.length})</h2>
                  <Link href="/profile/medications?new=1" className="text-sm underline decoration-ember-orange underline-offset-[3px]">Thêm thuốc</Link>
                </div>
                {schedules.length ? (
                  <ul className="mt-4 divide-y divide-mist">
                    {schedules.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-4 py-4">
                        <div>
                          <p>{[s.name, s.dosage].filter(Boolean).join(" ")}</p>
                          <p className="text-sm text-slate">{s.times.join(", ")} · {daysSummary(s.days)}{s.remind ? " · nhắc Google" : ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/profile/medications?edit=${s.id}`} className="text-sm underline underline-offset-[3px]">Sửa</Link>
                          <form action={deleteScheduleAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <Button type="submit" variant="ghost" size="sm">Xóa</Button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-steel">Chưa có lịch nào.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
