import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CircleRole } from "@/lib/labels";

export const INVITE_TTL_DAYS = 7;
export const MAX_PENDING_INVITES = 20;
export const MAX_INVITES_PER_HOUR = 10;

export type HistoryChoice = "from_accept" | "30d" | "all";
export const historyDays: Record<HistoryChoice, number | null> = {
  from_accept: 0,
  "30d": 30,
  all: null,
};

export type InviteRow = {
  id: string;
  circle_id: string;
  email: string | null;
  role: CircleRole;
  history_days: number | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  declined_at: string | null;
  created_at: string;
};

const INVITE_COLS =
  "id, circle_id, email, role, history_days, expires_at, accepted_at, revoked_at, declined_at, created_at";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (e: string) => e.trim().toLowerCase();
export const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");
const newCode = () => randomBytes(32).toString("base64url");

export function isPending(i: InviteRow) {
  return !i.accepted_at && !i.revoked_at && !i.declined_at && Date.parse(i.expires_at) > Date.now();
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function ensureOwnCircle(ownerId: string) {
  const db = supabaseAdmin();
  const find = () => db.from("circles").select("id, name").eq("subject_id", ownerId).maybeSingle();

  let { data, error } = await find();
  if (error) throw new Error(error.message);
  if (data) return data;

  const ins = await db.from("circles").insert({ subject_id: ownerId, name: "Gia đình" }).select("id, name").single();
  if (ins.error) {
    // Lost a race with another request: the unique index guarantees one circle per wearer.
    ({ data, error } = await find());
    if (error || !data) throw new Error(ins.error.message);
    return data;
  }
  await db
    .from("circle_members")
    .upsert({ circle_id: ins.data.id, user_id: ownerId, role: "owner", status: "active" }, { onConflict: "circle_id,user_id" });
  return ins.data;
}

export type CreateInviteResult = { ok: true; link: string; email: string } | { ok: false; error: string };

export async function createInvite(input: {
  ownerId: string;
  ownerEmail: string;
  email: string;
  role: CircleRole;
  history: HistoryChoice;
  allowReports?: boolean;
}): Promise<CreateInviteResult> {
  const email = normalizeEmail(input.email);
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, error: "Email không hợp lệ." };
  if (email === normalizeEmail(input.ownerEmail)) return { ok: false, error: "Bạn không thể mời chính mình." };
  if (input.role !== "guardian" && input.role !== "viewer") return { ok: false, error: "Vai trò không hợp lệ." };
  if (!(input.history in historyDays)) return { ok: false, error: "Phạm vi lịch sử không hợp lệ." };

  const db = supabaseAdmin();
  const circle = await ensureOwnCircle(input.ownerId);
  const nowIso = new Date().toISOString();

  const [recent, pending, existing] = await Promise.all([
    db
      .from("circle_invites")
      .select("id", { count: "exact", head: true })
      .eq("circle_id", circle.id)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString()),
    db
      .from("circle_invites")
      .select("id", { count: "exact", head: true })
      .eq("circle_id", circle.id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .is("declined_at", null)
      .gt("expires_at", nowIso),
    db
      .from("circle_members")
      .select("user_id, users!inner(email)")
      .eq("circle_id", circle.id)
      .neq("status", "removed")
      .eq("users.email", email)
      .limit(1),
  ]);
  if ((recent.count ?? 0) >= MAX_INVITES_PER_HOUR)
    return { ok: false, error: "Bạn đã mời quá nhiều trong 1 giờ. Vui lòng thử lại sau." };
  if ((pending.count ?? 0) >= MAX_PENDING_INVITES)
    return { ok: false, error: "Có quá nhiều lời mời đang chờ. Hãy thu hồi bớt." };
  // Only members of the caller's own circle are checked, so this never reveals whether an email has an account.
  if (existing.data?.length) return { ok: false, error: "Người này đã ở trong circle của bạn." };

  // Free the unique slot held by an expired but never-closed invite for the same email.
  await db
    .from("circle_invites")
    .update({ revoked_at: nowIso })
    .eq("circle_id", circle.id)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .is("declined_at", null)
    .lte("expires_at", nowIso);

  const code = newCode();
  const { error } = await db.from("circle_invites").insert({
    circle_id: circle.id,
    invited_by: input.ownerId,
    email,
    code_hash: hashCode(code),
    role: input.role,
    history_days: historyDays[input.history],
    // Only guardians can ever hold the AI-report permission (also enforced by a DB check).
    allow_reports: input.role === "guardian" && input.allowReports === true,
    expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 86400_000).toISOString(),
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Đã có lời mời đang chờ cho email này." };
    throw new Error(error.message);
  }
  return { ok: true, link: `${appUrl()}/invite/${code}`, email };
}

export async function listCircleAdmin(ownerId: string) {
  const db = supabaseAdmin();
  const circle = await ensureOwnCircle(ownerId);
  const [members, invites] = await Promise.all([
    db
      .from("circle_members")
      .select("user_id, role, status, joined_at, history_from, can_generate_reports, ai_consent_at, users(name, email)")
      .eq("circle_id", circle.id)
      .neq("status", "removed")
      .order("joined_at"),
    db
      .from("circle_invites")
      .select(INVITE_COLS)
      .eq("circle_id", circle.id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .is("declined_at", null)
      .order("created_at", { ascending: false }),
  ]);
  if (members.error) throw new Error(members.error.message);
  if (invites.error) throw new Error(invites.error.message);
  return {
    circle,
    members: members.data as unknown as {
      user_id: string;
      role: CircleRole;
      status: string;
      joined_at: string;
      history_from: string | null;
      can_generate_reports: boolean;
      ai_consent_at: string | null;
      users: { name: string | null; email: string } | null;
    }[],
    invites: (invites.data as InviteRow[]).map((i) => ({ ...i, expired: Date.parse(i.expires_at) <= Date.now() })),
  };
}

export async function getInviteByCode(code: string) {
  const { data, error } = await supabaseAdmin()
    .from("circle_invites")
    .select(INVITE_COLS)
    .eq("code_hash", hashCode(code))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as InviteRow | null;
}

export async function getInviteContext(invite: InviteRow) {
  const { data } = await supabaseAdmin()
    .from("circles")
    .select("name, users:subject_id(name, email)")
    .eq("id", invite.circle_id)
    .maybeSingle();
  const subject = (data as unknown as { users: { name: string | null; email: string } | null } | null)?.users;
  return { subjectName: subject?.name ?? subject?.email ?? "Một người dùng" };
}

export async function listPendingForEmail(email: string) {
  const { data, error } = await supabaseAdmin()
    .from("circle_invites")
    .select(INVITE_COLS)
    .eq("email", normalizeEmail(email))
    .is("accepted_at", null)
    .is("revoked_at", null)
    .is("declined_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const invites = data as InviteRow[];
  const contexts = await Promise.all(invites.map(getInviteContext));
  return invites.map((invite, i) => ({ invite, ...contexts[i] }));
}

export async function acceptInvite(
  inviteId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin().rpc("accept_circle_invite", { p_invite: inviteId, p_user: userId });
  if (!error) return { ok: true };
  if (error.message.includes("email_mismatch")) return { ok: false, error: "Lời mời này dành cho một email khác." };
  if (error.message.includes("invite_invalid")) return { ok: false, error: "Lời mời không còn hiệu lực." };
  throw new Error(error.message);
}

export async function declineInvite(inviteId: string, userEmail: string) {
  const { error } = await supabaseAdmin()
    .from("circle_invites")
    .update({ declined_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("email", normalizeEmail(userEmail))
    .is("accepted_at", null)
    .is("revoked_at", null)
    .is("declined_at", null);
  if (error) throw new Error(error.message);
}

export async function revokeInvite(ownerId: string, inviteId: string) {
  const circle = await ensureOwnCircle(ownerId);
  const { error } = await supabaseAdmin()
    .from("circle_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("circle_id", circle.id)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (error) throw new Error(error.message);
}

// Turning this on is the wearer's consent for that guardian's reports (anonymized data goes to the configured AI service).
export async function setReportPermission(ownerId: string, userId: string, enabled: boolean) {
  if (userId === ownerId) return;
  const circle = await ensureOwnCircle(ownerId);
  const { error } = await supabaseAdmin()
    .from("circle_members")
    .update({ can_generate_reports: enabled, ai_consent_at: enabled ? new Date().toISOString() : null })
    .eq("circle_id", circle.id)
    .eq("user_id", userId)
    .eq("role", "guardian")
    .eq("status", "active");
  if (error) throw new Error(error.message);
}

export async function removeMember(ownerId: string, userId: string) {
  if (userId === ownerId) return;
  const circle = await ensureOwnCircle(ownerId);
  const { error } = await supabaseAdmin()
    .from("circle_members")
    .delete()
    .eq("circle_id", circle.id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
