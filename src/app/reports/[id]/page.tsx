import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dashboard/site-header";
import { AutoRefresh, PrintButton } from "@/components/reports/client-bits";
import { WeeklyBars } from "@/components/reports/weekly-bars";
import { alertStatusLabel, alertTypeLabel, severityLabel, type AlertSeverity } from "@/lib/labels";
import { renderFlag } from "@/lib/reports/flag-text";
import { getReportAccess, getReportForUser } from "@/lib/reports/service";
import { cn } from "@/lib/utils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dtFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const dFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

const severityClass: Record<AlertSeverity, string> = {
  low: "bg-fog text-steel",
  medium: "bg-mist text-graphite",
  high: "bg-ivory text-brass",
  critical: "bg-graphite text-white",
};
const failText: Record<string, string> = {
  ai_not_configured: "Dịch vụ AI chưa được cấu hình. Hãy báo quản trị viên.",
  ai_invalid_output: "AI trả về nội dung không đạt kiểm tra an toàn. Bạn có thể thử tạo lại.",
  ai_unavailable: "Không kết nối được dịch vụ AI. Vui lòng thử lại sau.",
  timeout: "Báo cáo mất quá lâu và đã bị hủy. Vui lòng thử tạo lại.",
};

const h2 = "font-heading text-[32px] leading-[1.19] tracking-[-0.02em]";

function Tag({ kind }: { kind: "data" | "ai" }) {
  return (
    <span className={cn("rounded-[20px] px-2.5 py-0.5 text-[12px]", kind === "ai" ? "bg-ivory text-brass" : "bg-fog text-steel")}>
      {kind === "ai" ? "AI viết" : "Tính từ dữ liệu"}
    </span>
  );
}

function Section({ n, title, kind, tone = "white", children }: { n: string; title: string; kind: "data" | "ai"; tone?: "white" | "ash" | "ivory"; children: React.ReactNode }) {
  const bg = { white: "bg-canvas-white", ash: "bg-ash", ivory: "bg-ivory" }[tone];
  return (
    <section className={cn("py-[60px] print:break-inside-avoid print:py-8", bg)}>
      <div className="mx-auto w-full max-w-[1200px] space-y-6 px-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-heading text-[13px] tracking-[-0.02em] text-brass">{n}</span>
          <h2 className={h2}>{title}</h2>
          <Tag kind={kind} />
        </div>
        {children}
      </div>
    </section>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/reports/${id}`)}`);
  if (!UUID_RE.test(id)) notFound();

  const report = await getReportForUser(id, session.user.id);
  if (!report) notFound();
  const access = await getReportAccess(session.user.id);
  const subjectName = access.status === "not_guardian" ? "người được theo dõi" : access.subjectName;

  const input = report.input_snapshot;
  const out = report.output;
  const evidence = report.evidence ?? {};
  const refLabel = (ref: string) => {
    const e = evidence[ref];
    return e ? `${dtFmt.format(new Date(e.detected_at))} (${alertTypeLabel[e.type]})` : ref;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="print:hidden">
        <SiteHeader userName={session.user.name} />
      </div>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] space-y-4 px-5 pt-10 pb-10">
          <Link href="/reports" className="font-heading text-[13px] tracking-[-0.02em] text-brass print:hidden">
            ← Báo cáo · {dFmt.format(new Date(report.period_start))} – {dFmt.format(new Date(report.period_end))}
          </Link>
          <h1 className="font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">
            Báo cáo sức khỏe {report.period_days} ngày
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate">
            <span>
              Báo cáo về {subjectName} · bạn tạo lúc {dtFmt.format(new Date(report.created_at))} · chỉ mình bạn xem
            </span>
            <Tag kind="data" />
            <Tag kind="ai" />
          </div>
          {report.status === "ready" && (
            <div className="pt-2 print:hidden">
              <PrintButton>In / Lưu PDF</PrintButton>
            </div>
          )}
        </section>

        {report.status === "pending" && (
          <section className="bg-ash py-[80px]">
            <AutoRefresh />
            <p className="mx-auto w-full max-w-[1200px] px-5 text-steel">Đang tạo báo cáo… Trang sẽ tự cập nhật.</p>
          </section>
        )}

        {report.status === "failed" && (
          <section className="bg-ash py-[80px]">
            <div className="mx-auto w-full max-w-[1200px] space-y-4 px-5">
              <p role="alert" className="text-lg underline decoration-ember-orange decoration-1 underline-offset-[3px]">
                {failText[report.error ?? ""] ?? "Không tạo được báo cáo."}
              </p>
              <Link href="/reports/new" className="inline-block underline decoration-ember-orange decoration-1 underline-offset-[3px]">
                Tạo lại báo cáo
              </Link>
            </div>
          </section>
        )}

        {report.status === "ready" && input && out && (
          <>
            {input.flags.length > 0 && (
              <section className="bg-ivory py-[60px] print:py-8">
                <div className="mx-auto w-full max-w-[1200px] space-y-6 px-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <h2 className={h2}>Điểm cần lưu ý</h2>
                    <Tag kind="data" />
                  </div>
                  <ul className="space-y-4">
                    {[...input.flags]
                      .sort((a, b) => ["urgent", "attention", "info"].indexOf(a.level) - ["urgent", "attention", "info"].indexOf(b.level))
                      .map((f) => {
                        const t = renderFlag(f);
                        return (
                          <li key={f.code} className="space-y-1">
                            <p className={cn("font-heading text-lg tracking-[-0.02em]", f.level === "urgent" && "underline decoration-ember-orange decoration-1 underline-offset-[6px]")}>
                              {t.title}
                            </p>
                            <p className="max-w-3xl text-steel">{t.body}</p>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              </section>
            )}

            <Section n="01" title="Tóm tắt" kind="ai">
              <p className="max-w-3xl text-lg leading-[1.4] text-graphite">{out.summary}</p>
            </Section>

            <Section n="02" title="Chỉ số chính" kind="data" tone="ash">
              <div className="grid gap-5 md:grid-cols-4">
                {[
                  { l: "Cảnh báo", v: String(input.alerts.total), d: input.previous ? `${input.alerts.total - input.previous.total >= 0 ? "↑" : "↓"} ${Math.abs(input.alerts.total - input.previous.total)} so với kỳ trước` : "Chưa có kỳ trước để so sánh" },
                  { l: "Cơn co giật", v: String(input.alerts.by_type.seizure), d: input.previous ? `kỳ trước: ${input.previous.by_type.seizure}` : "" },
                  { l: "Nhịp tim lúc cảnh báo", v: input.alerts.avg_alert_hr != null ? `${input.alerts.avg_alert_hr} bpm` : "—", d: input.sensor?.avg_hr != null ? `trung bình cả kỳ ${input.sensor.avg_hr} bpm` : "" },
                  { l: "Phản hồi trung bình", v: input.alerts.avg_response_sec != null ? `${input.alerts.avg_response_sec}s` : "—", d: `${input.alerts.false_alarms} / ${input.alerts.total} báo nhầm` },
                ].map((s) => (
                  <div key={s.l} className="rounded-[20px] bg-canvas-white p-8">
                    <p className="text-sm text-slate">{s.l}</p>
                    <p className="mt-3 font-heading text-[40px] leading-[1.2] tracking-[-0.02em]">{s.v}</p>
                    {s.d && <p className="mt-2 text-sm text-steel">{s.d}</p>}
                  </div>
                ))}
              </div>
            </Section>

            <Section n="03" title="Xu hướng" kind="ai">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-4 rounded-[20px] bg-ash p-8 md:p-10">
                  <div className="flex items-center gap-3">
                    <h3 className="font-heading text-lg tracking-[-0.02em]">Cảnh báo theo tuần</h3>
                    <Tag kind="data" />
                  </div>
                  <WeeklyBars values={input.alerts.by_week} />
                </div>
                <div className="space-y-6 rounded-[20px] bg-ash p-8 md:p-10">
                  {out.trends.length ? (
                    out.trends.map((t) => (
                      <div key={t.title} className="space-y-1">
                        <p className="font-heading text-lg tracking-[-0.02em]">{t.title}</p>
                        <p className="text-steel">{t.observation}</p>
                        {t.evidence_refs.length > 0 && <p className="text-[13px] text-slate">Dựa trên: {t.evidence_refs.map(refLabel).join("; ")}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-steel">Chưa đủ dữ liệu để nhận xét xu hướng.</p>
                  )}
                </div>
              </div>
            </Section>

            <Section n="04" title="Sự kiện đáng chú ý" kind="data" tone="ash">
              {Object.keys(evidence).length ? (
                <ul className="divide-y divide-mist border-y border-mist">
                  {Object.entries(evidence).map(([ref, e]) => (
                    <li key={ref} className="grid gap-2 py-4 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center md:gap-5">
                      <p className="font-heading text-lg tracking-[-0.02em]">{alertTypeLabel[e.type]}</p>
                      <p className="text-sm text-steel">{dtFmt.format(new Date(e.detected_at))}</p>
                      <p className="text-sm text-steel">
                        {e.heart_rate != null && `${e.heart_rate} bpm · `}
                        {alertStatusLabel[e.status as keyof typeof alertStatusLabel] ?? e.status}
                      </p>
                      <span className={cn("w-fit rounded-[20px] px-3 py-1 text-[13px] font-medium", severityClass[e.severity])}>{severityLabel[e.severity]}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-steel">Không có sự kiện nào trong kỳ.</p>
              )}
            </Section>

            <Section n="05" title="Tuân thủ điều trị" kind="data">
              <p className="max-w-3xl text-steel">Chưa có dữ liệu uống thuốc trong kỳ này. Số liệu sẽ xuất hiện khi người đeo bật nhắc thuốc và xác nhận &ldquo;Đã uống&rdquo;.</p>
            </Section>

            <Section n="06" title="Nên trao đổi với bác sĩ" kind="ai" tone="ash">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-4 rounded-[6px_0_0_0] bg-canvas-white p-8 md:p-10">
                  <h3 className="font-heading text-lg tracking-[-0.02em]">Câu hỏi gợi ý</h3>
                  {out.questions_for_doctor.map((q, i) => (
                    <p key={q} className="flex gap-3 text-graphite">
                      <span className="font-heading text-[13px] text-brass">{i + 1}</span>
                      {q}
                    </p>
                  ))}
                  {out.discuss_with_doctor.length > 0 && (
                    <div className="space-y-2 border-t border-mist pt-4">
                      <h3 className="font-heading text-lg tracking-[-0.02em]">Điều cần trao đổi</h3>
                      {out.discuss_with_doctor.map((q) => (
                        <p key={q} className="text-steel">· {q}</p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-4 rounded-[6px_0_0_0] bg-canvas-white p-8 md:p-10">
                  <h3 className="font-heading text-lg tracking-[-0.02em]">Gợi ý không phải y tế</h3>
                  {out.non_medical_suggestions.length ? out.non_medical_suggestions.map((q) => <p key={q} className="text-graphite">· {q}</p>) : <p className="text-steel">Không có gợi ý.</p>}
                </div>
              </div>
            </Section>

            {report.user_note && (
              <section className="py-[60px] print:py-8">
                <div className="mx-auto w-full max-w-[1200px] space-y-3 px-5">
                  <h2 className={h2}>Ghi chú của người tạo</h2>
                  <p className="max-w-3xl whitespace-pre-wrap text-steel">{report.user_note}</p>
                </div>
              </section>
            )}

            <Section n="07" title="Chất lượng dữ liệu" kind="data" tone="ash">
              <p className="max-w-3xl text-steel">
                {input.sensor
                  ? `Đồng hồ có dữ liệu nhịp tim ${input.sensor.days_with_data} / ${input.sensor.days_total} ngày. `
                  : "Không có dữ liệu nhịp tim từ đồng hồ trong kỳ. "}
                Chỉ gồm dữ liệu trong phạm vi bạn được xem. {out.data_quality_note}
              </p>
            </Section>
          </>
        )}

        <section className="mx-auto w-full max-w-[1200px] px-5 py-10">
          <p className="max-w-3xl text-[13px] text-slate">
            Báo cáo do UII tạo tự động với sự hỗ trợ của AI và chỉ mang tính tham khảo. Báo cáo không phải chẩn
            đoán hay chỉ định điều trị. Hãy trao đổi với bác sĩ trước khi thay đổi thuốc. Trong tình huống khẩn cấp, gọi 115.
          </p>
        </section>
      </main>
    </div>
  );
}
