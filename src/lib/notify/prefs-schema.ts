import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

// SMS is not offered: there is no provider behind it. Push means the in-app live notification.
export const prefsSchema = z
  .object({
    channels: z.array(z.enum(["push", "email"])).min(1).max(2),
    min_severity: z.enum(["low", "medium", "high", "critical"]),
    types: z.array(z.enum(["pre_seizure", "fall", "seizure"])).min(1).max(3),
    quiet_start: time.nullable(),
    quiet_end: time.nullable(),
  })
  .refine((p) => (p.quiet_start === null) === (p.quiet_end === null), { message: "quiet_pair" });

export type PrefsInput = z.infer<typeof prefsSchema>;

export function parsePrefsForm(f: { getAll(k: string): unknown[]; get(k: string): unknown }) {
  const s = (k: string) => {
    const v = f.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return prefsSchema.safeParse({
    channels: f.getAll("channels"),
    min_severity: f.get("min_severity"),
    types: f.getAll("types"),
    quiet_start: s("quiet_start"),
    quiet_end: s("quiet_end"),
  });
}
