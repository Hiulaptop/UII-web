import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dashboard/site-header";
import { PAGE_SIZE, listAlerts } from "@/lib/alerts";
import { resolveSubject } from "@/lib/dashboard";
import { alertStatusLabel, alertTypeLabel, severityLabel, type AlertSeverity } from "@/lib/labels";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

const timeFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const TYPES = ["pre_seizure", "fall", "seizure"] as const;
const STATUSES = ["open", "acknowledged", "resolved", "false_alarm"] as const;
const triggerLabel: Record<string, string> = { device_event: "Đồng hồ phát hiện", manual: "Bấm tay", algorithm: "Thuật toán" };
const severityClass: Record<AlertSeverity, string> = {
  low: "bg-fog text-steel",
  medium: "bg-mist text-graphite",
  high: "bg-ivory text-brass",
  critical: "bg-alarm text-graphite",
};

type SP = { type?: string; status?: string; page?: string };

function href(sp: SP, patch: Partial<SP>) {
  const q = new URLSearchParams();
  const next = { ...sp, ...patch };
  for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `/alerts?${s}` : "/alerts";
}

function Chip({ href: h, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={h} className={cn("rounded-[20px] px-4 py-2 text-sm", active ? "bg-graphite text-canvas-white" : "bg-ash text-graphite hover:bg-mist")}>
      {children}
    </Link>
  );
}

export default async function AlertsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Falerts");
  const sp = await searchParams;

  const type = TYPES.find((t) => t === sp.type);
  const status = STATUSES.find((s) => s === sp.status);
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);

  const { subjectId, historyFrom } = await resolveSubject(session.user.id);
  const [{ rows, total }, subject] = await Promise.all([
    listAlerts({ subjectId, historyFrom, type, status, page }),
    supabaseAdmin().from("users").select("name, email").eq("id", subjectId).single(),
  ]);
  const name = subject.data?.name ?? subject.data?.email ?? "";
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base: SP = { type, status };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader userName={session.user.name} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
          <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">{name}</p>
          <h1 className="mt-5 font-heading text-[40px] leading-[1.2] tracking-[-0.02em] md:text-[66px] md:leading-[0.91]">Lịch sử cảnh báo</h1>
        </section>

        <section className="mx-auto flex w-full max-w-[1200px] flex-wrap gap-3 px-5 pb-10">
          <Chip href={href(base, { type: undefined, page: undefined })} active={!type}>Tất cả</Chip>
          {TYPES.map((t) => (
            <Chip key={t} href={href(base, { type: t, page: undefined })} active={type === t}>{alertTypeLabel[t]}</Chip>
          ))}
          <span className="mx-2 w-px bg-mist" />
          <Chip href={href(base, { status: undefined, page: undefined })} active={!status}>Mọi trạng thái</Chip>
          {STATUSES.map((s) => (
            <Chip key={s} href={href(base, { status: s, page: undefined })} active={status === s}>{alertStatusLabel[s]}</Chip>
          ))}
        </section>

        <section className="bg-ash py-[80px]">
          <div className="mx-auto w-full max-w-[1200px] space-y-8 px-5">
            <div className="rounded-[20px] bg-canvas-white p-8 md:p-10">
              {rows.length ? (
                <ul className="divide-y divide-mist">
                  {rows.map((a) => (
                    <li key={a.id}>
                      <Link href={`/alerts/${a.id}`} className="grid gap-2 py-5 md:grid-cols-[1.4fr_1fr_1fr_auto_auto] md:items-center md:gap-5">
                        <div>
                          <p className="font-heading text-lg tracking-[-0.02em]">{alertTypeLabel[a.type]}</p>
                          <p className="text-sm text-slate">{triggerLabel[a.trigger] ?? a.trigger}</p>
                        </div>
                        <p className="text-sm text-steel">{timeFmt.format(new Date(a.detected_at))}</p>
                        <p className="text-sm text-steel">
                          {a.metrics?.heart_rate != null && `${a.metrics.heart_rate} bpm · `}
                          {alertStatusLabel[a.status]}
                        </p>
                        <span className={cn("w-fit rounded-[20px] px-3 py-1 text-[13px] font-medium", severityClass[a.severity])}>{severityLabel[a.severity]}</span>
                        <span className="text-sm underline decoration-ember-orange decoration-1 underline-offset-[3px]">Chi tiết →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-steel">Không có cảnh báo nào khớp bộ lọc.</p>
              )}
            </div>

            {pages > 1 && (
              <nav aria-label="Phân trang" className="flex items-center justify-center gap-3 text-sm">
                {page > 1 && <Link href={href(base, { page: String(page - 1) })} className="underline decoration-ember-orange underline-offset-[3px]">← Trước</Link>}
                <span className="text-slate">Trang {page} / {pages} · {total} cảnh báo</span>
                {page < pages && <Link href={href(base, { page: String(page + 1) })} className="underline decoration-ember-orange underline-offset-[3px]">Sau →</Link>}
              </nav>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
