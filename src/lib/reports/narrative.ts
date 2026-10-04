// Structure, validation and retry for the model-written part of a report.
// No I/O and no relative imports, so it runs under plain Node for tests.
import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);

export const NarrativeSchema = z.object({
  summary: text(900),
  trends: z
    .array(z.object({ title: text(80), observation: text(400), evidence_refs: z.array(z.string().max(8)).max(6) }))
    .max(5),
  discuss_with_doctor: z.array(text(300)).max(5),
  questions_for_doctor: z.array(text(250)).min(1).max(6),
  non_medical_suggestions: z.array(text(250)).max(5),
  data_quality_note: text(300),
});
export type Narrative = z.infer<typeof NarrativeSchema>;

// Described to the model (and sent as response_format when the gateway supports it); validation below is what is enforced.
export const narrativeJsonSchema = (() => {
  const schema = z.toJSONSchema(NarrativeSchema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
})();

// JS \b only understands ASCII letters, so word edges use Unicode-aware lookarounds.
const FORBIDDEN: { re: RegExp; reason: string }[] = [
  { re: /(?<![\p{L}\p{N}])\d+([.,]\d+)?\s?(mg|mcg|µg|g|ml|viên|ống)(?![\p{L}\p{N}])/iu, reason: "dose" },
  { re: /(tăng|giảm|ngừng|bỏ|đổi|thay|tự ý)\s+(liều|thuốc)/iu, reason: "medication_change" },
  { re: /(?<![\p{L}])kê đơn(?![\p{L}])/iu, reason: "prescription" },
  { re: /(?<![\p{L}])(chẩn đoán (là|xác định)|bạn bị|họ bị|người này bị)(?![\p{L}])/iu, reason: "diagnosis_claim" },
];

export function narrativeViolations(strings: string[]): string[] {
  const hits = new Set<string>();
  for (const s of strings) for (const f of FORBIDDEN) if (f.re.test(s)) hits.add(f.reason);
  return [...hits];
}

export function narrativeStrings(n: Narrative): string[] {
  return [
    n.summary,
    n.data_quality_note,
    ...n.trends.flatMap((t) => [t.title, t.observation]),
    ...n.discuss_with_doctor,
    ...n.questions_for_doctor,
    ...n.non_medical_suggestions,
  ];
}

export type ValidationResult = { ok: true; value: Narrative } | { ok: false; errors: string[] };

export function validateNarrative(raw: string, allowedRefs: string[]): ValidationResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ["Đầu ra không phải JSON hợp lệ."] };
  }
  const parsed = NarrativeSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "root"}: ${i.message}`) };
  }
  const errors: string[] = [];
  const allowed = new Set(allowedRefs);
  for (const t of parsed.data.trends) {
    for (const ref of t.evidence_refs) if (!allowed.has(ref)) errors.push(`Mã sự kiện không tồn tại: ${ref}`);
  }
  for (const reason of narrativeViolations(narrativeStrings(parsed.data))) {
    errors.push(`Nội dung vi phạm quy tắc an toàn (${reason}).`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: parsed.data };
}

export class NarrativeError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super("Mô hình không tạo được nội dung hợp lệ.");
    this.errors = errors;
  }
}

// `call` receives feedback about the previous failure on retries so the model can correct itself.
export async function generateWithRetry(
  call: (feedback?: string) => Promise<string>,
  allowedRefs: string[],
  maxAttempts = 2,
): Promise<{ narrative: Narrative; attempts: number }> {
  let errors: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await call(attempt === 1 ? undefined : errors.join("\n"));
    const result = validateNarrative(raw, allowedRefs);
    if (result.ok) return { narrative: result.value, attempts: attempt };
    errors = result.errors;
  }
  throw new NarrativeError(errors);
}
