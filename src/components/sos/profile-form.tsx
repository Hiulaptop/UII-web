"use client";

import { useActionState, useState } from "react";
import { saveProfileAction, type ProfileState } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EditableProfile } from "@/lib/sos/service";

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SEX = ["Nam", "Nữ", "Khác"];
const field = "text-[14px] text-steel";
const inp = "h-11 rounded-none border-graphite bg-canvas-white";
const sel = "h-11 w-full border border-graphite bg-canvas-white px-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-graphite";
const box = "space-y-5 rounded-[20px] bg-canvas-white p-8 md:p-10";
const h2 = "font-heading text-[28px] leading-[1.19] tracking-[-0.02em]";

let keySeq = 0;
const withKeys = <T,>(rows: T[]) => rows.map((r) => ({ ...r, _k: ++keySeq }));

export function ProfileForm({ initial }: { initial: EditableProfile }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfileAction, null);
  const p = initial.profile;
  const [meds, setMeds] = useState(() => withKeys(initial.meds.length ? initial.meds : [{ name: "", dosage: "", schedule: "" }]));
  const [contacts, setContacts] = useState(() => withKeys(initial.contacts.length ? initial.contacts : [{ name: "", relation: "", phone: "" }]));

  return (
    <form action={action} className="space-y-5">
      <div className={box}>
        <h2 className={h2}>Thông tin cơ bản</h2>
        <label className="block space-y-2">
          <span className={field}>Họ và tên</span>
          <Input name="full_name" defaultValue={p?.full_name ?? ""} maxLength={120} autoComplete="name" className={inp} />
        </label>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="block space-y-2">
            <span className={field}>Ngày sinh</span>
            <Input name="date_of_birth" type="date" defaultValue={p?.date_of_birth ?? ""} className={inp} />
          </label>
          <label className="block space-y-2">
            <span className={field}>Giới tính</span>
            <select name="sex" defaultValue={p?.sex ?? ""} className={sel}>
              <option value="">—</option>
              {SEX.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="block space-y-2">
            <span className={field}>Nhóm máu</span>
            <select name="blood_type" defaultValue={p?.blood_type ?? ""} className={sel}>
              <option value="">—</option>
              {BLOOD.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <label className="block space-y-2">
            <span className={field}>Chiều cao (cm)</span>
            <Input name="height_cm" inputMode="decimal" defaultValue={p?.height_cm ?? ""} className={inp} />
          </label>
          <label className="block space-y-2">
            <span className={field}>Cân nặng (kg)</span>
            <Input name="weight_kg" inputMode="decimal" defaultValue={p?.weight_kg ?? ""} className={inp} />
          </label>
        </div>
      </div>

      <div className={box}>
        <h2 className={h2}>Động kinh</h2>
        <label className="block space-y-2">
          <span className={field}>Chẩn đoán / loại động kinh</span>
          <Input name="epilepsy_type" defaultValue={p?.epilepsy_type ?? ""} maxLength={200} className={inp} />
        </label>
        <label className="block space-y-2">
          <span className={field}>Ghi chú cho người cấp cứu (cơn thường kéo dài bao lâu, dấu hiệu báo trước, cách xử trí đã được bác sĩ dặn…)</span>
          <textarea
            name="seizure_notes"
            defaultValue={p?.seizure_notes ?? ""}
            maxLength={1000}
            rows={4}
            className="w-full border border-graphite bg-canvas-white p-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-graphite"
          />
        </label>
        <label className="block space-y-2">
          <span className={field}>Dị ứng (cách nhau bằng dấu phẩy hoặc xuống dòng)</span>
          <Input name="allergies" defaultValue={p?.allergies.join(", ") ?? ""} className={inp} />
        </label>
        <label className="block space-y-2">
          <span className={field}>Bệnh nền khác</span>
          <Input name="conditions" defaultValue={p?.conditions.join(", ") ?? ""} className={inp} />
        </label>
      </div>

      <div className={box}>
        <h2 className={h2}>Thuốc đang dùng</h2>
        {meds.map((m, i) => (
          <div key={m._k} className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr_auto] sm:items-end">
            <label className="block space-y-2">
              <span className={field}>Tên thuốc</span>
              <Input name="med_name" defaultValue={m.name} maxLength={80} className={inp} />
            </label>
            <label className="block space-y-2">
              <span className={field}>Liều</span>
              <Input name="med_dosage" defaultValue={m.dosage ?? ""} maxLength={60} className={inp} />
            </label>
            <label className="block space-y-2">
              <span className={field}>Giờ uống</span>
              <Input name="med_schedule" defaultValue={m.schedule ?? ""} maxLength={80} className={inp} />
            </label>
            <Button type="button" variant="ghost" onClick={() => setMeds(meds.filter((_, j) => j !== i))} aria-label={`Xoá thuốc ${i + 1}`}>
              Xoá
            </Button>
          </div>
        ))}
        {meds.length < 20 && (
          <Button type="button" variant="outline" onClick={() => setMeds([...meds, ...withKeys([{ name: "", dosage: "", schedule: "" }])])}>
            Thêm thuốc
          </Button>
        )}
      </div>

      <div className={box}>
        <h2 className={h2}>Người liên hệ khẩn cấp</h2>
        <p className="text-sm text-steel">Người đầu tiên được gọi trước.</p>
        {contacts.map((c, i) => (
          <div key={c._k} className="grid gap-3 sm:grid-cols-[2fr_1.2fr_1.5fr_auto] sm:items-end">
            <label className="block space-y-2">
              <span className={field}>Họ tên</span>
              <Input name="contact_name" defaultValue={c.name} maxLength={80} className={inp} />
            </label>
            <label className="block space-y-2">
              <span className={field}>Quan hệ</span>
              <Input name="contact_relation" defaultValue={c.relation ?? ""} maxLength={40} className={inp} />
            </label>
            <label className="block space-y-2">
              <span className={field}>Số điện thoại</span>
              <Input name="contact_phone" type="tel" defaultValue={c.phone} maxLength={20} className={inp} />
            </label>
            <Button type="button" variant="ghost" onClick={() => setContacts(contacts.filter((_, j) => j !== i))} aria-label={`Xoá người liên hệ ${i + 1}`}>
              Xoá
            </Button>
          </div>
        ))}
        {contacts.length < 5 && (
          <Button type="button" variant="outline" onClick={() => setContacts([...contacts, ...withKeys([{ name: "", relation: "", phone: "" }])])}>
            Thêm người liên hệ
          </Button>
        )}
      </div>

      <div className={box}>
        <h2 className={h2}>Bác sĩ và bệnh viện</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className={field}>Bác sĩ điều trị</span>
            <Input name="doctor_name" defaultValue={p?.doctor_name ?? ""} maxLength={120} className={inp} />
          </label>
          <label className="block space-y-2">
            <span className={field}>Số điện thoại bác sĩ</span>
            <Input name="doctor_phone" type="tel" defaultValue={p?.doctor_phone ?? ""} maxLength={20} className={inp} />
          </label>
          <label className="block space-y-2 sm:col-span-2">
            <span className={field}>Bệnh viện đang theo dõi</span>
            <Input name="hospital" defaultValue={p?.hospital ?? ""} maxLength={200} className={inp} />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu hồ sơ"}
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
