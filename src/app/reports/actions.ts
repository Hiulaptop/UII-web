"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createReport } from "@/lib/reports/service";

// Generation takes 10-20 seconds, so the action awaits it and redirects to the finished (or failed) report.
export async function createReportAction(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login?callbackUrl=%2Freports");

  const result = await createReport({
    userId,
    periodDays: Number(formData.get("period")),
    note: String(formData.get("note") ?? ""),
  });
  if (!result.ok) redirect(`/reports/new?error=${result.error}`);
  redirect(`/reports/${result.id}`);
}
