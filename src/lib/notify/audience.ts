import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { publish, type LiveEvent } from "./hub";

/** Tells everyone who can see this wearer's alerts (the wearer and active circle members) that something changed. */
export async function publishToCircle(subjectId: string, e: LiveEvent) {
  const { data } = await supabaseAdmin()
    .from("circle_members")
    .select("user_id, circles!inner(subject_id)")
    .eq("status", "active")
    .eq("circles.subject_id", subjectId);
  const ids = new Set<string>([subjectId, ...((data as { user_id: string }[] | null) ?? []).map((m) => m.user_id)]);
  for (const id of ids) publish(id, e);
}
