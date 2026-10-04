import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildReportData } from "./aggregate";
import { AiNotConfigured, writeNarrative } from "./ai";
import { NarrativeError } from "./narrative";
import type { ReportRow } from "./types";

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];
export const REPORTS_PER_DAY = 5;
const STALE_PENDING_MS = 10 * 60_000;
const NOTE_MAX = 1000;

export type ReportAccess =
  | { status: "ok"; subjectId: string; subjectName: string; historyFrom: string | null }
  | { status: "no_permission"; subjectId: string; subjectName: string }
  | { status: "not_guardian" };

type MembershipRow = {
  can_generate_reports: boolean;
  history_from: string | null;
  circles: { subject_id: string; users: { name: string | null; email: string } | null };
};

// Only an active guardian whom the wearer explicitly allowed can create or read reports about that wearer.
export async function getReportAccess(userId: string): Promise<ReportAccess> {
  const { data, error } = await supabaseAdmin()
    .from("circle_members")
    .select("can_generate_reports, history_from, circles!inner(subject_id, users:subject_id(name, email))")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("role", "guardian")
    .neq("circles.subject_id", userId)
    .order("joined_at");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as MembershipRow[];
  if (!rows.length) return { status: "not_guardian" };

  const pick = rows.find((r) => r.can_generate_reports) ?? rows[0];
  const subjectName = pick.circles.users?.name ?? pick.circles.users?.email ?? "Người được theo dõi";
  const subjectId = pick.circles.subject_id;
  return pick.can_generate_reports
    ? { status: "ok", subjectId, subjectName, historyFrom: pick.history_from }
    : { status: "no_permission", subjectId, subjectName };
}

export type CreateReportResult =
  | { ok: true; id: string }
  | { ok: false; error: "not_allowed" | "rate_limited" | "insufficient_range" | "invalid_period" };

export async function createReport(input: { userId: string; periodDays: number; note: string }): Promise<CreateReportResult> {
  if (!(PERIODS as readonly number[]).includes(input.periodDays)) return { ok: false, error: "invalid_period" };
  const periodDays = input.periodDays as Period;

  const access = await getReportAccess(input.userId);
  if (access.status !== "ok") return { ok: false, error: "not_allowed" };

  const db = supabaseAdmin();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const recent = await db.from("reports").select("id", { count: "exact", head: true }).eq("requested_by", input.userId).gte("created_at", since);
  if (recent.error) throw new Error(recent.error.message);
  if ((recent.count ?? 0) >= REPORTS_PER_DAY) return { ok: false, error: "rate_limited" };

  const data = await buildReportData({ subjectId: access.subjectId, periodDays, historyFrom: access.historyFrom });
  if (!data.ok) return { ok: false, error: data.error };

  const note = input.note.trim().slice(0, NOTE_MAX);
  const ins = await db
    .from("reports")
    .insert({
      subject_id: access.subjectId,
      requested_by: input.userId,
      period_days: periodDays,
      period_start: data.start.toISOString(),
      period_end: data.end.toISOString(),
      user_note: note || null,
      input_snapshot: data.input,
      evidence: data.evidence,
    })
    .select("id")
    .single();
  if (ins.error) throw new Error(ins.error.message);
  const id = ins.data.id as string;

  try {
    const { narrative, model } = await writeNarrative(data.input);
    await db.from("reports").update({ status: "ready", output: narrative, model, completed_at: new Date().toISOString() }).eq("id", id);
  } catch (e) {
    const code = e instanceof AiNotConfigured ? "ai_not_configured" : e instanceof NarrativeError ? "ai_invalid_output" : "ai_unavailable";
    // Log only the error class: the message can echo request content, which is health data.
    console.error("[reports] generation failed:", code, e instanceof Error ? e.name : typeof e);
    await db.from("reports").update({ status: "failed", error: code, completed_at: new Date().toISOString() }).eq("id", id);
  }
  return { ok: true, id };
}

export async function getReportForUser(reportId: string, userId: string): Promise<ReportRow | null> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("reports").select("*").eq("id", reportId).eq("requested_by", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const report = data as ReportRow;

  // Revoking the wearer's permission hides existing reports too.
  const m = await db
    .from("circle_members")
    .select("user_id, circles!inner(subject_id)")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("role", "guardian")
    .eq("can_generate_reports", true)
    .eq("circles.subject_id", report.subject_id)
    .limit(1);
  if (m.error) throw new Error(m.error.message);
  if (!m.data?.length) return null;

  if (report.status === "pending" && Date.now() - Date.parse(report.created_at) > STALE_PENDING_MS) {
    await db.from("reports").update({ status: "failed", error: "timeout", completed_at: new Date().toISOString() }).eq("id", report.id).eq("status", "pending");
    return { ...report, status: "failed", error: "timeout" };
  }
  return report;
}

export async function listReportsForUser(userId: string, subjectId: string) {
  const { data, error } = await supabaseAdmin()
    .from("reports")
    .select("id, period_days, period_start, period_end, status, created_at, input_snapshot")
    .eq("requested_by", userId)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data as unknown as Pick<ReportRow, "id" | "period_days" | "period_start" | "period_end" | "status" | "created_at" | "input_snapshot">[];
}

// For the wearer: who created a report and when. Never the content.
export async function listReportLog(subjectId: string) {
  const { data, error } = await supabaseAdmin()
    .from("reports")
    .select("id, period_days, status, created_at, requester:users!requested_by(name, email)")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data as unknown as { id: string; period_days: number; status: string; created_at: string; requester: { name: string | null; email: string } | null }[];
}
