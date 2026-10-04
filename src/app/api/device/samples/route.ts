import { authenticateDevice } from "@/lib/device/auth";
import { json, readJson } from "@/lib/device/http";
import { ingestSamples } from "@/lib/device/ingest";
import { createLimiter } from "@/lib/device/rate-limit";
import { MAX_BODY_BYTES, samplesBodySchema } from "@/lib/device/schemas";

const limiter = createLimiter(120, 60_000);

// Batches of signal summaries (heart rate, motion) measured by the watch.
export async function POST(req: Request) {
  const device = await authenticateDevice(req);
  if (!device) return json(401, { error: "unauthorized" });
  if (!limiter.allow(device.deviceId)) return json(429, { error: "rate_limited" });

  const body = await readJson(req, MAX_BODY_BYTES.samples, samplesBodySchema);
  if (!body.ok) return body.res;

  const result = await ingestSamples(device, body.data.samples, body.data.battery_pct);
  return json(200, { ...result, server_time: Date.now() });
}
