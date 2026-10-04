import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dashboard/site-header";
import { buttonVariants } from "@/components/ui/button";
import { getReportAccess, listReportsForUser } from "@/lib/reports/service";

const rangeFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const createdFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const statusLabel = { pending: "Đang tạo…", ready: "Đã tạo", failed: "Không tạo được" } as const;

function Shell({ name, children }: { name?: string | null; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={name} />
      <main className="flex-1">{children}</main>
      <footer className="mx-auto w-full max-w-[1200px] px-5 py-10 font-heading text-[13px] tracking-[-0.02em] text-slate">
        UII · Giám sát động kinh
      </footer>
    </div>
  );
}

const hero = (label: string, sub: string, action?: React.ReactNode) => (
  <section className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
    <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">{label}</p>
    <h1 className="mt-5 max-w-3xl font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">
      Báo cáo sức khỏe
    </h1>
    <p className="mt-5 max-w-xl text-lg leading-[1.25] text-steel">{sub}</p>
    {action && <div className="mt-8">{action}</div>}
  </section>
);

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Freports");
  const access = await getReportAccess(session.user.id);

  if (access.status === "not_guardian") {
    return (
      <Shell name={session.user.name}>
        {hero("Dành cho người thân", "Báo cáo do người giám hộ tạo cho người họ theo dõi. Nếu bạn là người đeo, hãy quản lý quyền ở mục Circle.")}
        <section className="bg-ash py-[80px]">
          <div className="mx-auto w-full max-w-[1200px] px-5">
            <Link href="/circle" className={buttonVariants({ variant: "outline" })}>
              Mở Circle
            </Link>
          </div>
        </section>
      </Shell>
    );
  }

  if (access.status === "no_permission") {
    return (
      <Shell name={session.user.name}>
        {hero(`Bạn đang theo dõi · ${access.subjectName}`, "Báo cáo về người bạn theo dõi, chỉ bạn xem được nội dung.")}
        <section className="bg-ash py-[80px]">
          <div className="mx-auto w-full max-w-[1200px] px-5">
            <div className="space-y-3 rounded-[20px] bg-canvas-white p-8 md:p-10">
              <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">Chưa được cấp quyền</p>
              <h2 className="font-heading text-[32px] leading-[1.19] tracking-[-0.02em]">
                {access.subjectName} chưa cho phép bạn tạo báo cáo sức khỏe bằng AI
              </h2>
              <p className="text-steel">
                Quyền này do người đeo quyết định trong mục Circle. Bạn vẫn xem được cảnh báo và hồ sơ SOS như bình thường.
              </p>
            </div>
          </div>
        </section>
      </Shell>
    );
  }

  const reports = await listReportsForUser(session.user.id, access.subjectId);
  return (
    <Shell name={session.user.name}>
      {hero(
        `Bạn đang theo dõi · ${access.subjectName}`,
        `Báo cáo về ${access.subjectName} do bạn tạo. Chỉ bạn xem được nội dung; ${access.subjectName} chỉ thấy bạn đã tạo báo cáo vào lúc nào.`,
        <Link href="/reports/new" className={buttonVariants({ size: "lg" })}>
          Tạo báo cáo mới
        </Link>,
      )}
      <section className="bg-ash py-[80px]">
        <div className="mx-auto w-full max-w-[1200px] space-y-5 px-5">
          {reports.length ? (
            reports.map((r) => (
              <Link
                key={r.id}
                href={`/reports/${r.id}`}
                className="flex flex-col gap-3 rounded-[20px] bg-canvas-white p-8 md:flex-row md:items-center md:justify-between md:p-10"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-heading text-[32px] leading-[1.19] tracking-[-0.02em]">Báo cáo {r.period_days} ngày</h2>
                    <span className="rounded-[20px] bg-fog px-3 py-1 text-[13px] text-steel">{statusLabel[r.status]}</span>
                  </div>
                  <p className="text-sm text-slate">
                    {rangeFmt.format(new Date(r.period_start))} – {rangeFmt.format(new Date(r.period_end))} · tạo {createdFmt.format(new Date(r.created_at))}
                  </p>
                  {r.status === "ready" && r.input_snapshot && (
                    <p className="text-steel">{r.input_snapshot.alerts.total} cảnh báo trong kỳ</p>
                  )}
                </div>
                <span className="underline decoration-ember-orange decoration-1 underline-offset-[3px]">Xem</span>
              </Link>
            ))
          ) : (
            <p className="rounded-[20px] bg-canvas-white p-8 text-steel md:p-10">Chưa có báo cáo nào. Bấm &ldquo;Tạo báo cáo mới&rdquo; để bắt đầu.</p>
          )}
        </div>
      </section>
    </Shell>
  );
}
