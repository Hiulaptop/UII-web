import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { InviteForm } from "@/components/circle/invite-form";
import { SiteHeader } from "@/components/dashboard/site-header";
import { Button } from "@/components/ui/button";
import { listCircleAdmin } from "@/lib/invites";
import { circleRoleLabel, historyLabel, memberStatusLabel, type MemberStatus } from "@/lib/labels";
import { listReportLog } from "@/lib/reports/service";
import { removeMemberAction, revokeInviteAction, setReportPermissionAction } from "./actions";

const dateFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const dateTimeFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const h2 = "font-heading text-[32px] leading-[1.19] tracking-[-0.02em]";

export default async function CirclePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fcircle");

  const [{ circle, members, invites }, reportLog] = await Promise.all([
    listCircleAdmin(session.user.id),
    listReportLog(session.user.id),
  ]);
  const others = members.filter((m) => m.user_id !== session.user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={session.user.name} />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-[80px]">
          <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">{circle.name}</p>
          <h1 className="mt-5 max-w-3xl font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">
            Những người luôn bên bạn.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-[1.25] text-steel">
            Mời người thân bằng email. Họ chỉ thấy dữ liệu của bạn sau khi tự chấp nhận lời mời.
          </p>
          <Link href="/circle/notifications" className="mt-4 inline-block text-sm text-steel underline hover:text-graphite">
            Cài đặt thông báo của tôi
          </Link>
        </section>

        <section className="bg-ash py-[80px]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-5 px-5 lg:grid-cols-2">
            <div className="rounded-[6px_0_0_0] bg-canvas-white p-8 md:pt-[70px] md:pr-10 md:pb-10 md:pl-[60px]">
              <h2 className={h2}>Mời người thân</h2>
              <p className="mt-3 mb-10 text-sm text-steel">
                Người được mời chưa cần có tài khoản. Lời mời chờ họ đăng nhập bằng đúng email này.
              </p>
              <InviteForm />
            </div>

            <div className="space-y-5">
              <div className="rounded-[20px] bg-canvas-white p-8 md:p-10">
                <h2 className="font-heading text-lg tracking-[-0.02em]">Thành viên ({others.length})</h2>
                {others.length ? (
                  <ul className="mt-5 divide-y divide-mist">
                    {others.map((m) => (
                      <li key={m.user_id} className="flex items-center justify-between gap-5 py-4">
                        <div>
                          <p className="text-graphite">{m.users?.name ?? m.users?.email}</p>
                          <p className="text-sm text-slate">
                            {circleRoleLabel[m.role]} · {memberStatusLabel[m.status as MemberStatus]}
                            {m.history_from === null ? " · toàn bộ lịch sử" : ` · xem từ ${dateFmt.format(new Date(m.history_from))}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {m.role === "guardian" && (
                            <form action={setReportPermissionAction} className="flex items-center gap-3">
                              <input type="hidden" name="userId" value={m.user_id} />
                              <input type="hidden" name="enabled" value={m.can_generate_reports ? "0" : "1"} />
                              <span className={m.can_generate_reports ? "text-sm text-graphite" : "text-sm text-slate"}>
                                Báo cáo AI: {m.can_generate_reports ? "được phép" : "tắt"}
                              </span>
                              <Button type="submit" variant="outline" size="sm">
                                {m.can_generate_reports ? "Thu hồi" : "Cho phép"}
                              </Button>
                            </form>
                          )}
                          <form action={removeMemberAction}>
                            <input type="hidden" name="userId" value={m.user_id} />
                            <Button type="submit" variant="outline" size="sm">
                              Xóa
                            </Button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-sm text-steel">Chưa có thành viên nào.</p>
                )}
              </div>

              <div className="rounded-[20px] bg-canvas-white p-8 md:p-10">
                <h2 className="font-heading text-lg tracking-[-0.02em]">Lời mời đang chờ ({invites.length})</h2>
                {invites.length ? (
                  <ul className="mt-5 divide-y divide-mist">
                    {invites.map((i) => {
                      const expired = i.expired;
                      return (
                        <li key={i.id} className="flex items-center justify-between gap-5 py-4">
                          <div>
                            <p className="text-graphite">{i.email}</p>
                            <p className="text-sm text-slate">
                              {circleRoleLabel[i.role]} · {historyLabel(i.history_days)} ·{" "}
                              {expired ? "đã hết hạn" : `hết hạn ${dateFmt.format(new Date(i.expires_at))}`}
                            </p>
                          </div>
                          <form action={revokeInviteAction}>
                            <input type="hidden" name="inviteId" value={i.id} />
                            <Button type="submit" variant="outline" size="sm">
                              Thu hồi
                            </Button>
                          </form>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-5 text-sm text-steel">Không có lời mời nào đang chờ.</p>
                )}
              </div>

              <div className="rounded-[20px] bg-canvas-white p-8 md:p-10">
                <h2 className="font-heading text-lg tracking-[-0.02em]">Báo cáo AI đã được tạo ({reportLog.length})</h2>
                <p className="mt-1 text-sm text-slate">Bạn chỉ thấy ai đã tạo và khi nào, không thấy nội dung báo cáo.</p>
                {reportLog.length ? (
                  <ul className="mt-5 divide-y divide-mist">
                    {reportLog.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-5 py-3">
                        <span className="text-graphite">{r.requester?.name ?? r.requester?.email ?? "Không rõ"}</span>
                        <span className="text-sm text-slate">
                          {r.period_days} ngày · {dateTimeFmt.format(new Date(r.created_at))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-sm text-steel">Chưa có báo cáo nào.</p>
                )}
              </div>
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
