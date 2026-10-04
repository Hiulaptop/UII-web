"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { saveScheduleAction, type ScheduleState } from "@/app/profile/medications/actions";
import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildEvents, previewLine } from "@/lib/medication/calendar-events";
import { DAY_LABELS, MAX_TIMES } from "@/lib/medication/schedule";
import type { ScheduleRow } from "@/lib/medication/service";

const field = "text-[14px] text-steel";
const inp = "h-11 rounded-none border-graphite bg-canvas-white";

export function ScheduleForm({ initial, today, calendarConnected }: { initial: ScheduleRow | null; today: string; calendarConnected: boolean }) {
  const [state, action, pending] = useActionState<ScheduleState, FormData>(saveScheduleAction, null);
  const [name, setName] = useState(initial?.name ?? "");
  const [dosage, setDosage] = useState(initial?.dosage ?? "");
  const [times, setTimes] = useState<string[]>(initial?.times ?? ["08:00"]);
  const [days, setDays] = useState<number[]>(initial?.days ?? [1, 2, 3, 4, 5, 6, 7]);
  const [start, setStart] = useState(initial?.start_date ?? today);
  const [end, setEnd] = useState(initial?.end_date ?? "");
  const [remind, setRemind] = useState(initial?.remind ?? false);
  const [lead, setLead] = useState<0 | 10>((initial?.lead_minutes as 0 | 10) ?? 10);
  const [newTime, setNewTime] = useState("12:00");

  const events = useMemo(
    () => (name.trim() && times.length && days.length ? buildEvents({ name: name.trim(), dosage: dosage.trim() || null, times, days, start_date: start || today, end_date: end || null, lead_minutes: remind ? lead : 0 }) : []),
    [name, dosage, times, days, start, end, lead, remind, today],
  );

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  const addTime = () => {
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime) && !times.includes(newTime) && times.length < MAX_TIMES) setTimes([...times, newTime].sort());
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_460px]">
      <form action={action} className="space-y-6 rounded-[20px] bg-canvas-white p-8 md:p-10">
        {initial && <input type="hidden" name="id" value={initial.id} />}
        <h2 className="font-heading text-lg tracking-[-0.02em]">Thông tin thuốc</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className={field}>Tên thuốc</span>
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} className={inp} />
          </label>
          <label className="block space-y-2">
            <span className={field}>Liều dùng</span>
            <Input name="dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} maxLength={60} className={inp} />
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className={field}>Giờ uống</legend>
          <div className="flex flex-wrap items-center gap-2">
            {times.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-graphite px-3 py-1.5 text-sm text-canvas-white">
                <input type="hidden" name="time" value={t} />
                {t}
                <button type="button" aria-label={`Bỏ giờ ${t}`} onClick={() => setTimes(times.filter((x) => x !== t))} disabled={times.length === 1} className="ml-1 disabled:opacity-40">×</button>
              </span>
            ))}
            <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label="Giờ mới" className="h-9 border border-graphite bg-canvas-white px-2 text-sm" />
            <button type="button" onClick={addTime} className="rounded-full bg-ash px-3 py-1.5 text-sm hover:bg-mist">+ Thêm giờ</button>
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className={field}>Ngày trong tuần</legend>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, i) => {
              const d = i + 1;
              const on = days.includes(d);
              return (
                <label key={d} className={`cursor-pointer rounded-full px-4 py-1.5 text-sm ${on ? "bg-graphite text-canvas-white" : "bg-ash text-graphite"}`}>
                  <input type="checkbox" name="day" value={d} checked={on} onChange={() => toggleDay(d)} className="sr-only" />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className={field}>Bắt đầu</span>
            <Input name="start_date" type="date" value={start} onChange={(e) => setStart(e.target.value)} required className={inp} />
          </label>
          <label className="block space-y-2">
            <span className={field}>Kết thúc (không bắt buộc)</span>
            <Input name="end_date" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={inp} />
          </label>
        </div>

        <div className="space-y-4 border-t border-mist pt-6">
          <h3 className="font-heading text-lg tracking-[-0.02em]">Nhắc nhở</h3>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block">Nhắc qua Google Calendar</span>
              <span className="block text-sm text-slate">
                {calendarConnected ? "Tạo sự kiện lặp trong lịch “UII – Thuốc”." : (
                  <>Chưa kết nối Google. <Link href="/settings/google" className="underline decoration-ember-orange underline-offset-[3px]">Kết nối</Link> để bật.</>
                )}
              </span>
            </span>
            <input type="checkbox" name="remind" checked={remind && calendarConnected} disabled={!calendarConnected} onChange={(e) => setRemind(e.target.checked)} className="size-5 accent-graphite" aria-label="Nhắc qua Google Calendar" />
          </label>
          <fieldset className="space-y-1" disabled={!remind || !calendarConnected}>
            <label className="flex items-center gap-3 py-1">
              <input type="radio" name="lead_minutes" value="0" checked={lead === 0} onChange={() => setLead(0)} className="size-4 accent-graphite" /> Nhắc đúng giờ
            </label>
            <label className="flex items-center gap-3 py-1">
              <input type="radio" name="lead_minutes" value="10" checked={lead === 10} onChange={() => setLead(10)} className="size-4 accent-graphite" /> Nhắc trước 10 phút
            </label>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? "Đang lưu…" : "Lưu lịch thuốc"}</Button>
          <Link href="/profile/medications" className={buttonVariants({ variant: "outline" })}>Hủy</Link>
          {state?.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
        </div>
      </form>

      <div className="space-y-5 self-start">
        <div className="rounded-[20px] bg-canvas-white p-8 md:p-10">
          <h2 className="font-heading text-lg tracking-[-0.02em]">Sẽ tạo trong Google Calendar</h2>
          <p className="mt-2 text-sm text-slate">Lịch &ldquo;UII – Thuốc&rdquo; · lặp hằng tuần</p>
          {remind && calendarConnected && events.length ? (
            <ul className="mt-4 divide-y divide-mist">
              {events.map((e) => (
                <li key={e.key} className="flex gap-4 py-3 text-sm">
                  <span className="font-heading text-lg">{e.startsAt}</span>
                  <span className="self-center text-steel">{previewLine(e, lead)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-steel">{calendarConnected ? "Bật nhắc để xem các sự kiện sẽ được tạo." : "Kết nối Google Calendar để dùng nhắc nhở."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
