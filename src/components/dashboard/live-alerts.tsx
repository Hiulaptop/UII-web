"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const TYPE: Record<string, string> = { pre_seizure: "Dấu hiệu tiền động kinh", fall: "Té ngã", seizure: "Nghi co giật" };

// Listens for alerts pushed by the server and refreshes whatever page is open. Reconnects on its own (EventSource).
export function LiveAlerts() {
  const router = useRouter();
  useEffect(() => {
    const es = new EventSource("/api/events");
    es.addEventListener("alert", (ev) => {
      try {
        const a = JSON.parse((ev as MessageEvent).data) as { alertId: string; type: string; subject: string; severity: string };
        const critical = a.severity === "critical" || a.severity === "high";
        (critical ? toast.error : toast.warning)(`${a.subject || "Người thân"}: ${TYPE[a.type] ?? "Cảnh báo"}`, {
          duration: 30_000,
          action: { label: "Xem", onClick: () => router.push(`/alerts/${a.alertId}`) },
        });
      } catch {}
      router.refresh();
    });
    es.addEventListener("alert_updated", () => router.refresh());
    return () => es.close();
  }, [router]);
  return null;
}
