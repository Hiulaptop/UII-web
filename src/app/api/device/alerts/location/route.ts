import { authenticateDevice } from "@/lib/device/auth";
import { json, readJson } from "@/lib/device/http";
import { ingestLocation } from "@/lib/device/ingest";
import { createLimiter } from "@/lib/device/rate-limit";
import { locationBodySchema, MAX_BODY_BYTES } from "@/lib/device/schemas";

const limiter = createLimiter(20, 60_000);

// A later position of an alert the watch already sent (milestones after the SOS). Safe to retry.
export async function POST(req: Request) {
  const device = await authenticateDevice(req);
  if (!device) return json(401, { error: "unauthorized" });
  if (!limiter.allow(device.deviceId)) return json(429, { error: "rate_limited" });

  const body = await readJson(req, MAX_BODY_BYTES.location, locationBodySchema);
  if (!body.ok) return body.res;

  const result = await ingestLocation(device, body.data);
  if (!result.ok) return json(result.error === "not_found" ? 404 : 422, { error: result.error });
  return json(200, { status: result.status, server_time: Date.now() });
}
