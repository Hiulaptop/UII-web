"use client";

import { useActionState } from "react";
import { createPairingCodeAction, type PairingState } from "@/app/devices/actions";
import { Button } from "@/components/ui/button";

const timeFmt = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });

export function PairingForm() {
  const [state, action, pending] = useActionState<PairingState, FormData>(() => createPairingCodeAction(), null);

  return (
    <form action={action} className="space-y-5">
      {state?.code && (
        <div role="status" className="space-y-2">
          <p className="font-heading text-[66px] leading-[0.91] tracking-[-0.02em]">
            <span className="underline decoration-ember-orange decoration-1 underline-offset-[10px]">{state.code}</span>
          </p>
          <p className="text-sm text-slate">Hết hạn lúc {timeFmt.format(new Date(state.expiresAt!))}. Mã dùng được một lần.</p>
        </div>
      )}
      {state?.error && <p role="alert" className="text-sm underline decoration-ember-orange decoration-1 underline-offset-[3px]">{state.error}</p>}
      <Button type="submit" variant={state?.code ? "outline" : "default"} disabled={pending}>
        {pending ? "Đang tạo..." : state?.code ? "Tạo mã mới" : "Tạo mã ghép nối"}
      </Button>
    </form>
  );
}
