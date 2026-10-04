"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { applyAlertAction, type AlertAction } from "@/lib/alerts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS: AlertAction[] = ["acknowledge", "false_alarm", "resolve"];

export async function alertAction(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  const id = formData.get("alertId");
  const action = formData.get("action");
  if (!userId) redirect("/login");
  if (typeof id !== "string" || !UUID_RE.test(id) || !ACTIONS.includes(action as AlertAction)) throw new Error("Invalid request");

  const result = await applyAlertAction(id, userId, action as AlertAction);
  revalidatePath(`/alerts/${id}`);
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
  redirect(result.ok ? `/alerts/${id}` : `/alerts/${id}?error=${result.error}`);
}
