import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SubmitButton } from "@/components/reports/client-bits";
import { buttonVariants } from "@/components/ui/button";
import { getReportAccess, PERIODS, REPORTS_PER_DAY } from "@/lib/reports/service";
import { createReportAction } from "../actions";

const dateFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

const errors: Record<string, string> = {
  rate_limited: `Bạn đã tạo tối đa ${REPORTS_PER_DAY} báo cáo trong 24 giờ. Vui lòng thử lại sau.`,
  insufficient_range: "Không đủ dữ liệu trong phạm vi bạn được xem (cần ít nhất 3 ngày).",
  not_allowed: "Bạn chưa có quyền tạo báo cáo.",
  invalid_period: "Kỳ báo cáo không hợp lệ.",
};

const WHAT_SENT = ["Số cảnh báo theo loại, theo giờ trong ngày", "Nhịp tim trung bình, cao nhất", "Thời gian phản hồi, tỉ lệ báo nhầm", "Nhóm tuổi, giới tính"];
const WHAT_NOT_SENT = ["Họ tên, email, số điện thoại", "Ngày sinh, địa chỉ", "Tọa độ chính xác", "Ghi chú bạn nhập bên dưới"];

export default async function NewReportPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Freports%2Fnew");
  const access = await getReportAccess(session.user.id);
  if (access.status !== "ok") redirect("/reports");
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={session.user.name} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
          <Link href="/reports" className="font-heading text-[13px] tracking-[-0.02em] text-brass">
            ← Báo cáo
          </Link>
          <h1 className="mt-5 font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">Tạo báo cáo</h1>
          <p className="mt-5 max-w-xl text-lg leading-[1.25] text-steel">
            Báo cáo về {access.subjectName}, trong phạm vi dữ liệu bạn được xem. Mất khoảng 10–20 giây.
          </p>
        </section>

        <section className="bg-ash py-[80px]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-5 px-5 lg:grid-cols-[1fr_420px]">
            <form action={createReportAction} className="space-y-5">
              <div className="space-y-3 rounded-[20px] bg-canvas-white p-8 md:p-10">
                <h2 className="font-heading text-lg tracking-[-0.02em]">Kỳ báo cáo</h2>
                <div className="flex flex-wrap gap-3">
                  {PERIODS.map((p) => (
                    <label key={p} className="cursor-pointer">
                      <input type="radio" name="period" value={p} defaultChecked={p === 30} className="peer sr-only" />
                      <span className="inline-block rounded-[20px] bg-ash px-4 py-2 text-sm peer-checked:bg-graphite peer-checked:text-canvas-white peer-focus-visible:ring-2 peer-focus-visible:ring-graphite">
                        {p} ngày
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-[13px] text-slate">
                  {access.historyFrom
                    ? `Bạn xem được dữ liệu từ ${dateFmt.format(new Date(access.historyFrom))} (theo phạm vi ${access.subjectName} đã cấp). Kỳ dài hơn sẽ tự rút ngắn.`
                    : `Bạn xem được toàn bộ lịch sử của ${access.subjectName}.`}
                </p>
              </div>

              <div className="space-y-3 rounded-[20px] bg-canvas-white p-8 md:p-10">
                <label htmlFor="note" className="font-heading text-lg tracking-[-0.02em]">
                  Ghi chú của bạn cho bác sĩ (không bắt buộc)
                </label>
                <textarea
                  id="note"
                  name="note"
                  maxLength={1000}
                  rows={4}
                  placeholder="Ví dụ: tuần này ngủ muộn, đổi thuốc ngày 12/09..."
                  className="w-full border border-graphite bg-canvas-white p-2.5 outline-none focus-visible:ring-2 focus-visible:ring-graphite"
                />
                <p className="text-[13px] text-slate">Ghi chú được in nguyên văn trong báo cáo và không gửi cho AI.</p>
              </div>

              <div className="space-y-3 rounded-[6px_0_0_0] bg-ivory p-8">
                <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">Quyền từ {access.subjectName}</p>
                <p className="text-sm text-steel">
                  {access.subjectName} đã cho phép bạn tạo báo cáo sức khỏe bằng AI và có thể thu hồi quyền này bất cứ lúc nào. Số
                  liệu gửi tới dịch vụ AI đã ẩn danh. Báo cáo chỉ dành cho bạn.
                </p>
              </div>

              {error && (
                <p role="alert" className="text-sm underline decoration-ember-orange decoration-1 underline-offset-[3px]">
                  {errors[error] ?? "Không tạo được báo cáo."}
                </p>
              )}

              <div className="flex gap-3">
                <SubmitButton pendingText="Đang tạo báo cáo…">Tạo báo cáo</SubmitButton>
                <Link href="/reports" className={buttonVariants({ size: "lg", variant: "outline" })}>
                  Hủy
                </Link>
              </div>
            </form>

            <aside className="space-y-4 self-start rounded-[20px] bg-canvas-white p-8 md:p-10">
              <h2 className="font-heading text-lg tracking-[-0.02em]">Dữ liệu gửi đi</h2>
              <div className="space-y-2">
                <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">CÓ GỬI</p>
                {WHAT_SENT.map((t) => (
                  <p key={t} className="text-sm text-steel">
                    · {t}
                  </p>
                ))}
              </div>
              <div className="space-y-2 border-t border-mist pt-4">
                <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">KHÔNG GỬI</p>
                {WHAT_NOT_SENT.map((t) => (
                  <p key={t} className="text-sm text-steel">
                    · {t}
                  </p>
                ))}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
