"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction, revokeAllSosLinksAction, type SettingsState } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";

export function RevokeLinksButton() {
  const [pending, start] = useTransition();
  const [state, setState] = useState<SettingsState>(null);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col items-end gap-2">
      {confirming ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => start(async () => { setState(await revokeAllSosLinksAction()); setConfirming(false); })}
          >
            {pending ? "Đang thu hồi…" : "Chắc chắn"}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)}>Hủy</Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => { setState(null); setConfirming(true); }}>Thu hồi tất cả</Button>
      )}
      {state?.message && <p role="status" className="text-sm text-steel">{state.message}</p>}
    </div>
  );
}

export function DeleteAccount({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  if (!open) return <Button variant="outline" onClick={() => setOpen(true)}>Xóa tài khoản</Button>;
  return (
    <form
      className="space-y-3"
      action={(fd) => start(async () => { const r = await deleteAccountAction(null, fd); if (r?.error) setError(r.error); })}
    >
      <label className="block space-y-2">
        <span className="text-[14px] text-steel">Gõ <strong className="text-graphite">{email}</strong> để xác nhận</span>
        <input
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="h-11 w-full border border-graphite bg-canvas-white px-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-graphite"
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="outline" disabled={!matches || pending}>{pending ? "Đang xóa…" : "Xóa vĩnh viễn"}</Button>
        <Button type="button" variant="ghost" onClick={() => { setOpen(false); setTyped(""); setError(null); }}>Hủy</Button>
      </div>
      {error && <p role="alert" className="text-sm text-emergency">{error}</p>}
    </form>
  );
}
