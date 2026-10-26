// Request contracts for the watch. Anything outside these ranges is rejected rather than stored.
import { z } from "zod";

export const MAX_SAMPLES_PER_REQUEST = 720;
export const MAX_SNAPSHOT_POINTS = 12_000;
export const MAX_BODY_BYTES = { pair: 4_096, samples: 262_144, alerts: 786_432, location: 2_048 } as const;
// Fixes after the alert are only useful while the incident is going on.
export const MAX_LOCATIONS_PER_ALERT = 6;
export const LOCATION_WINDOW_MS = 15 * 60_000;
export const MAX_PAST_MS = 7 * 86_400_000;
export const MAX_FUTURE_MS = 5 * 60_000;

const ms = z.number().int().positive();
const num = (min: number, max: number) => z.number().min(min).max(max);

export const pairSchema = z.object({
  code: z.string().min(8).max(12),
  name: z.string().trim().min(1).max(60).optional(),
  model: z.string().trim().max(80).optional(),
  platform: z.string().trim().max(30).optional(),
});

export const sampleSchema = z
  .object({
    t: ms, // window start, epoch milliseconds
    hr: num(20, 250).optional(),
    spo2: num(50, 100).optional(),
    temp_c: num(20, 45).optional(),
    accel_mean: num(0, 400).optional(),
    accel_max: num(0, 400).optional(),
    accel_var: num(0, 100_000).optional(),
    steps: z.number().int().min(0).max(100_000).optional(),
  })
  .strict()
  .refine((s) => Object.keys(s).some((k) => k !== "t"), { message: "sample has no measurements" });

export const samplesBodySchema = z
  .object({
    samples: z.array(z.unknown()).min(1).max(MAX_SAMPLES_PER_REQUEST),
    battery_pct: z.number().int().min(0).max(100).optional(),
  })
  .strict();

export const alertTypes = ["pre_seizure", "fall", "seizure"] as const;
export const severities = ["low", "medium", "high", "critical"] as const;

export const alertBodySchema = z
  .object({
    client_id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
    type: z.enum(alertTypes),
    trigger: z.enum(["device_event", "manual", "algorithm"]).default("device_event"),
    detected_at: ms,
    severity: z.enum(severities).optional(),
    confidence: num(0, 1).optional(),
    lat: num(-90, 90).optional(),
    lng: num(-180, 180).optional(),
    accuracy_m: num(0, 10_000).optional(),
    fix_time: ms.optional(),
    metrics: z.object({ heart_rate: num(20, 250).optional(), accel_peak: num(0, 400).optional() }).strict().optional(),
    snapshot: z
      .object({
        sample_rate_hz: num(1, 200),
        started_at: ms,
        axes: z.array(z.tuple([num(-400, 400), num(-400, 400), num(-400, 400)])).min(1).max(MAX_SNAPSHOT_POINTS),
      })
      .strict()
      .optional(),
  })
  .strict()
  // A position is a pair: half of one is useless and probably a bug on the watch.
  .refine((b) => (b.lat === undefined) === (b.lng === undefined), { message: "lat and lng go together" });

// A later fix of an alert the watch already sent, found again through the alert's client_id.
export const locationBodySchema = z
  .object({
    client_id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
    lat: num(-90, 90),
    lng: num(-180, 180),
    accuracy_m: num(0, 10_000).optional(),
    fix_time: ms,
  })
  .strict();

export type Sample = z.infer<typeof sampleSchema>;
export type AlertBody = z.infer<typeof alertBodySchema>;
export type LocationBody = z.infer<typeof locationBodySchema>;

export const timestampOk = (t: number, now: number) => t <= now + MAX_FUTURE_MS && t >= now - MAX_PAST_MS;

// A fall or seizure that reached the server is treated as urgent; an early warning is high but not critical.
export function defaultSeverity(type: (typeof alertTypes)[number]): (typeof severities)[number] {
  return type === "pre_seizure" ? "high" : "critical";
}
