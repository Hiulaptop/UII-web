import { authenticateDevice } from "@/lib/device/auth";
import { json, readJson } from "@/lib/device/http";
import { ingestAlert } from "@/lib/device/ingest";
import { createLimiter } from "@/lib/device/rate-limit";
import { alertBodySchema, MAX_BODY_BYTES } from "@/lib/device/schemas";

const limiter = createLimiter(30, 60_000);

// Safe to retry: the same client_id always returns the same alert (status "duplicate" after the first time).
export async function POST(req: Request) {
  const device = await authenticateDevice(req);
  if (!device) return json(401, { error: "unauthorized" });
  if (!limiter.allow(device.deviceId)) return json(429, { error: "rate_limited" });

  const body = await readJson(req, MAX_BODY_BYTES.alerts, alertBodySchema);
  if (!body.ok) return body.res;

  const result = await ingestAlert(device, body.data);
  if (!result.ok) return json(422, { error: result.error });
  return json(result.status === "created" ? 201 : 200, { id: result.id, status: result.status, server_time: Date.now() });
}
