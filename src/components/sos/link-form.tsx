"use client";

import { useActionState, useState } from "react";
import { createLinkAction, type LinkState } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";

const choices = [
  { value: "30d", label: "30 ngày" },
  { value: "1y", label: "1 năm" },
  { value: "never", label: "Không hết hạn (in lên vòng tay, ốp lưng)" },
];

export function LinkForm() {
  const [state, action, pending] = useActionState<LinkState, FormData>(createLinkAction, null);
  const [copied, setCopied] = useState(false);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: the link stays selectable */
    }
  }

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-[14px] text-steel">Thời hạn của mã mới</legend>
          {choices.map((c) => (
            <label key={c.value} className="flex cursor-pointer items-center gap-3 py-1">
              <input type="radio" name="ttl" value={c.value} defaultChecked={c.value === "1y"} className="size-4 accent-graphite" />
              {c.label}
            </label>
          ))}
        </fieldset>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang tạo…" : "Tạo mã QR mới"}
        </Button>
        {state?.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
      </form>

      {state?.url && state.qr && (
        <div className="rounded-[20px] border border-graphite p-6" role="status">
          <p className="font-heading text-lg tracking-[-0.02em]">Mã mới đã sẵn sàng</p>
          <p className="mt-2 text-sm text-steel">
            Hãy lưu hoặc in ngay. Vì lý do bảo mật, hệ thống không lưu liên kết này và sẽ không hiển thị lại.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qr} alt="Mã QR dẫn tới thẻ SOS" width={240} height={240} className="mt-5 border border-mist" />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input readOnly value={state.url} onFocus={(e) => e.currentTarget.select()} aria-label="Liên kết thẻ SOS" className="h-11 min-w-0 flex-1 border border-graphite bg-canvas-white px-2.5 text-sm" />
            <Button type="button" variant="outline" onClick={() => copy(state.url!)}>
              {copied ? "Đã chép" : "Sao chép"}
            </Button>
            <a href={state.qr} download="uii-sos-qr.png" className="text-sm underline">
              Tải ảnh QR
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
