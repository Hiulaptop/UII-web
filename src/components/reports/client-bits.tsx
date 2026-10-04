"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({ children, pendingText }: { children: React.ReactNode; pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? pendingText : children}
    </Button>
  );
}

export function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()}>
      {children}
    </Button>
  );
}

// A report left in "pending" (for example the tab was closed mid-generation) refreshes itself until it finishes.
export function AutoRefresh({ everyMs = 4000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(t);
  }, [router, everyMs]);
  return null;
}
