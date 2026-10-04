// Validation for the SOS profile form. Pure (no path aliases) so it runs under plain Node for tests.
import { z } from "zod";

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export const SEX_VALUES = ["Nam", "Nữ", "Khác"] as const;
export const MAX_MEDS = 20;
export const MAX_CONTACTS = 5;

const text = (max: number) => z.string().trim().max(max).transform((s) => s || null);
const optNum = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : Number(s.replace(",", "."))))
    .refine((n) => n === null || (Number.isFinite(n) && n >= min && n <= max), { message: "range" });

// Characters a phone number can contain; the card renders it as a tel: link, so nothing else gets through.
export const PHONE_RE = /^\+?[0-9][0-9 .()-]{4,18}[0-9]$/;
const phone = z.string().trim().regex(PHONE_RE);

const list = z
  .string()
  .transform((s) => s.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean))
  .refine((a) => a.length <= 20 && a.every((x) => x.length <= 80), { message: "list" });

const dob = z
  .string()
  .trim()
  .transform((s) => s || null)
  .refine((s) => s === null || (/^\d{4}-\d{2}-\d{2}$/.test(s) && Date.parse(s) <= Date.now() && Date.parse(s) >= Date.parse("1900-01-01")), { message: "dob" });

export const profileSchema = z.object({
  full_name: text(120),
  date_of_birth: dob,
  sex: z.enum(["", ...SEX_VALUES]).transform((s) => s || null),
  blood_type: z.enum(["", ...BLOOD_TYPES]).transform((s) => s || null),
  height_cm: optNum(30, 250),
  weight_kg: optNum(2, 400),
  epilepsy_type: text(200),
  seizure_notes: text(1000),
  allergies: list,
  conditions: list,
  doctor_name: text(120),
  doctor_phone: z.string().trim().transform((s) => s || null).refine((s) => s === null || PHONE_RE.test(s), { message: "phone" }),
  hospital: text(200),
});

export const medSchema = z.object({ name: z.string().trim().min(1).max(80), dosage: text(60), schedule: text(80) });
export const contactSchema = z.object({ name: z.string().trim().min(1).max(80), relation: text(40), phone });

export type SosProfileInput = {
  profile: z.output<typeof profileSchema>;
  meds: z.output<typeof medSchema>[];
  contacts: z.output<typeof contactSchema>[];
};

type FormLike = { get(k: string): unknown; getAll(k: string): unknown[] };
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Reads the repeated rows (med_name[], med_dosage[], …) and drops rows left entirely blank. */
export function parseSosForm(f: FormLike): { ok: true; data: SosProfileInput } | { ok: false; error: string } {
  const p = profileSchema.safeParse(Object.fromEntries(Object.keys(profileSchema.shape).map((k) => [k, str(f.get(k))])));
  if (!p.success) return { ok: false, error: fieldError(p.error.issues[0]?.path[0]) };

  const rows = (names: string[]) => {
    const cols = names.map((n) => f.getAll(n).map(str));
    const len = Math.max(0, ...cols.map((c) => c.length));
    const out: Record<string, string>[] = [];
    for (let i = 0; i < len; i++) {
      const row = Object.fromEntries(names.map((n, j) => [n, (cols[j][i] ?? "").trim()]));
      if (Object.values(row).some(Boolean)) out.push(row);
    }
    return out;
  };

  const medRows = rows(["name", "dosage", "schedule"].map((k) => `med_${k}`)).map((r) => ({ name: r.med_name, dosage: r.med_dosage, schedule: r.med_schedule }));
  if (medRows.length > MAX_MEDS) return { ok: false, error: `Tối đa ${MAX_MEDS} loại thuốc.` };
  const meds: SosProfileInput["meds"] = [];
  for (const r of medRows) {
    const m = medSchema.safeParse(r);
    if (!m.success) return { ok: false, error: "Mỗi loại thuốc cần có tên (tối đa 80 ký tự)." };
    meds.push(m.data);
  }

  const contactRows = rows(["name", "relation", "phone"].map((k) => `contact_${k}`)).map((r) => ({ name: r.contact_name, relation: r.contact_relation, phone: r.contact_phone }));
  if (contactRows.length > MAX_CONTACTS) return { ok: false, error: `Tối đa ${MAX_CONTACTS} người liên hệ.` };
  const contacts: SosProfileInput["contacts"] = [];
  for (const r of contactRows) {
    const c = contactSchema.safeParse(r);
    if (!c.success) return { ok: false, error: "Người liên hệ cần có tên và số điện thoại hợp lệ (chỉ gồm số, dấu +, khoảng trắng, dấu chấm, gạch ngang, ngoặc)." };
    contacts.push(c.data);
  }
  return { ok: true, data: { profile: p.data, meds, contacts } };
}

const FIELD_ERRORS: Record<string, string> = {
  date_of_birth: "Ngày sinh không hợp lệ.",
  height_cm: "Chiều cao phải từ 30 đến 250 cm.",
  weight_kg: "Cân nặng phải từ 2 đến 400 kg.",
  doctor_phone: "Số điện thoại bác sĩ không hợp lệ.",
  allergies: "Dị ứng: tối đa 20 mục, mỗi mục tối đa 80 ký tự.",
  conditions: "Bệnh nền: tối đa 20 mục, mỗi mục tối đa 80 ký tự.",
  seizure_notes: "Ghi chú về cơn co giật tối đa 1000 ký tự.",
};
const fieldError = (k: unknown) => FIELD_ERRORS[String(k)] ?? "Kiểm tra lại thông tin đã nhập.";
