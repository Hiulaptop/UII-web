"use client";

import { useActionState } from "react";
import { savePrefsAction, type PrefsState } from "@/app/circle/notifications/actions";
import { Button } from "@/components/ui/button";
import type { MyCirclePrefs } from "@/lib/notify/prefs";

const field = "text-[14px] text-steel";
const sel = "h-11 w-full border border-graphite bg-canvas-white px-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-graphite";
const types = [
  { v: "pre_seizure", l: "Dấu hiệu tiền động kinh" },
  { v: "fall", l: "Té ngã" },
  { v: "seizure", l: "Nghi co giật" },
] as const;

export function PrefsForm({ item, mailEnabled }: { item: MyCirclePrefs; mailEnabled: boolean }) {
  const [state, action, pending] = useActionState<PrefsState, FormData>(savePrefsAction, null);
  const p = item.prefs;
  return (
    <form action={action} className="space-y-6 rounded-[20px] bg-canvas-white p-8 md:p-10">
      <input type="hidden" name="circleId" value={item.circleId} />
      <h2 className="font-heading text-[28px] leading-[1.19] tracking-[-0.02em]">{item.subjectName}</h2>

      <fieldset className="space-y-2">
        <legend className={field}>Nhận thông báo qua</legend>
        <label className="flex items-center gap-3 py-1">
          <input type="checkbox" name="channels" value="push" defaultChecked={p.channels.includes("push")} className="size-4 accent-graphite" />
          Thông báo trong ứng dụng (hiện ngay khi bạn đang mở trang)
        </label>
        <label className="flex items-center gap-3 py-1">
          <input type="checkbox" name="channels" value="email" defaultChecked={p.channels.includes("email")} className="size-4 accent-graphite" />
          <span>
            Email {!mailEnabled && <span className="text-[13px] text-slate">· hệ thống chưa bật gửi email</span>}
          </span>
        </label>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className={field}>Loại cảnh báo</legend>
        {types.map((t) => (
          <label key={t.v} className="flex items-center gap-3 py-1">
            <input type="checkbox" name="types" value={t.v} defaultChecked={p.types.includes(t.v)} className="size-4 accent-graphite" />
            {t.l}
          </label>
        ))}
      </fieldset>

      <label className="block space-y-2">
        <span className={field}>Mức tối thiểu</span>
        <select name="min_severity" defaultValue={p.min_severity} className={sel}>
          <option value="low">Tất cả</option>
          <option value="medium">Trung bình trở lên</option>
          <option value="high">Cao trở lên</option>
          <option value="critical">Chỉ nguy kịch</option>
        </select>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className={field}>Giờ yên lặng từ</span>
          <input type="time" name="quiet_start" defaultValue={p.quiet_start ?? ""} className={sel} />
        </label>
        <label className="block space-y-2">
          <span className={field}>đến</span>
          <input type="time" name="quiet_end" defaultValue={p.quiet_end ?? ""} className={sel} />
        </label>
      </div>
      <p className="text-[13px] text-slate">Cảnh báo nguy kịch luôn được gửi, kể cả trong giờ yên lặng hay mức tối thiểu cao hơn.</p>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu"}
        </Button>
        {state?.ok && (
          <span role="status" className="text-sm text-steel">
            Đã lưu.
          </span>
        )}
        {state?.error && (
          <span role="alert" className="text-sm text-red-700">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
