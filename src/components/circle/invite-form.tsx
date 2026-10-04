"use client";

import { useActionState, useState } from "react";
import { createInviteAction, type InviteState } from "@/app/circle/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const histories = [
  { value: "30d", label: "30 ngày gần nhất", hint: "Mặc định" },
  { value: "from_accept", label: "Chỉ từ khi chấp nhận", hint: "Riêng tư nhất" },
  { value: "all", label: "Toàn bộ lịch sử", hint: "Gồm cả cảnh báo cũ" },
];

const field = "text-[14px] text-steel";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInviteAction, null);
  const [copied, setCopied] = useState(false);

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: the link stays selectable in the field */
    }
  }

  return (
    <div>
      <form action={action} className="space-y-5">
        <label className="block space-y-2">
          <span className={field}>Email người thân</span>
          <Input
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="nguoithan@gmail.com"
            className="h-11 rounded-none border-graphite bg-canvas-white"
          />
        </label>

        <label className="block space-y-2">
          <span className={field}>Vai trò</span>
          <select
            name="role"
            defaultValue="guardian"
            className="h-11 w-full border border-graphite bg-canvas-white px-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-graphite"
          >
            <option value="guardian">Người giám hộ</option>
            <option value="viewer">Người xem</option>
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className={field}>Người thân được xem lịch sử cảnh báo</legend>
          {histories.map((h) => (
            <label key={h.value} className="flex cursor-pointer items-center gap-3 py-1">
              <input type="radio" name="history" value={h.value} defaultChecked={h.value === "30d"} className="size-4 accent-graphite" />
              <span>
                {h.label} <span className="text-[13px] text-slate">· {h.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <label className="flex cursor-pointer items-start gap-3 py-1">
          <input type="checkbox" name="allow_reports" className="mt-1 size-4 accent-graphite" />
          <span>
            Cho phép tạo báo cáo sức khỏe bằng AI
            <span className="block text-[13px] text-slate">
              Chỉ áp dụng cho người giám hộ, mặc định tắt. Người này nhận báo cáo về bạn, tạo từ số liệu đã ẩn danh. Bạn
              thu hồi được bất cứ lúc nào.
            </span>
          </span>
        </label>

        {state?.error && (
          <p role="alert" className="text-[14px] underline decoration-ember-orange decoration-1 underline-offset-[3px]">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Đang tạo..." : "Tạo lời mời"}
        </Button>
      </form>

      {state?.link && (
        <div className="mt-10 bg-ivory p-5" role="status">
          <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">Lời mời cho {state.email}</p>
          <p className="mt-2 text-[14px] text-steel">
            Gửi link này cho người thân (Zalo, Messenger...). Link chỉ hiện một lần và hết hạn sau 7 ngày.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <Input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} className="h-11 rounded-none border-graphite bg-canvas-white" />
            <Button type="button" variant="outline" onClick={() => copy(state.link!)}>
              {copied ? "Đã chép" : "Sao chép"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
