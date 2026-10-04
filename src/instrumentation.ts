// Retries notifications that could not be sent straight away (mail server down, process restarted mid-send).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { dispatchPending } = await import("@/lib/notify/dispatch");
  const g = globalThis as unknown as { __uiiSweep?: NodeJS.Timeout };
  if (g.__uiiSweep) return;
  g.__uiiSweep = setInterval(() => {
    dispatchPending().catch((e) => console.error("[notify] sweep failed:", e instanceof Error ? e.name : typeof e));
  }, 30_000);
  g.__uiiSweep.unref();
}
