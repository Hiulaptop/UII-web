import { clientIp, json, readJson } from "@/lib/device/http";
import { pairDevice } from "@/lib/device/pairing";
import { MAX_BODY_BYTES, pairSchema } from "@/lib/device/schemas";

// The watch trades a short code (shown on the website) for a long-lived device token.
export async function POST(req: Request) {
  const body = await readJson(req, MAX_BODY_BYTES.pair, pairSchema);
  if (!body.ok) return body.res;

  const result = await pairDevice(body.data, clientIp(req));
  if (result.ok) return json(201, { device_id: result.deviceId, token: result.token, server_time: Date.now() });

  const status = { rate_limited: 429, invalid_code: 401, too_many_devices: 409 }[result.error];
  return json(status, { error: result.error });
}
