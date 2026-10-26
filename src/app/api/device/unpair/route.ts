import { authenticateDevice } from "@/lib/device/auth";
import { json } from "@/lib/device/http";
import { revokeDevice } from "@/lib/device/pairing";
import { createLimiter } from "@/lib/device/rate-limit";

const limiter = createLimiter(5, 60_000);

// The wearer disconnects the watch from the watch itself. Same effect as "remove" on the Devices page: the token stops
// working and the device leaves the list, so it can be paired again with a new code.
export async function POST(req: Request) {
  const device = await authenticateDevice(req);
  if (!device) return json(401, { error: "unauthorized" });
  if (!limiter.allow(device.deviceId)) return json(429, { error: "rate_limited" });

  await revokeDevice(device.userId, device.deviceId);
  return json(200, { ok: true });
}
