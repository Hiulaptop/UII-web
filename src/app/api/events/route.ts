import { auth } from "@/auth";
import { subscribe, type LiveEvent } from "@/lib/notify/hub";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Server-sent events: one long-lived response per open page. Heartbeats keep Cloudflare/proxies from closing it.
export async function GET(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return new Response(null, { status: 401 });

  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(ctrl) {
      const send = (s: string) => ctrl.enqueue(enc.encode(s));
      const onEvent = (e: LiveEvent) => send(`event: ${e.kind}\ndata: ${JSON.stringify(e)}\n\n`);
      const unsub = subscribe(uid, onEvent);
      const beat = setInterval(() => {
        try { send(": ping\n\n"); } catch { cleanup(); }
      }, 15_000);
      cleanup = () => {
        clearInterval(beat);
        unsub();
        try { ctrl.close(); } catch {}
      };
      req.signal.addEventListener("abort", cleanup);
      send("retry: 3000\n: connected\n\n");
    },
    cancel() { cleanup(); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
