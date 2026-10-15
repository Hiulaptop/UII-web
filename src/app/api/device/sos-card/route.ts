import { authenticateDevice } from "@/lib/device/auth";
import { json } from "@/lib/device/http";
import { createLimiter } from "@/lib/device/rate-limit";
import { loadProfile } from "@/lib/sos/service";
import { ageFromBirth } from "@/lib/sos/tokens";
import { toWatchCard } from "@/lib/sos/watch-card";

const limiter = createLimiter(10, 60_000);

// The watch caches this and shows it after an alert has been sent, so anyone holding the watch can read it.
// Only the reduced "watch card" fields leave the server (see lib/sos/watch-card.ts).
export async function GET(req: Request) {
  const device = await authenticateDevice(req);
  if (!device) return json(401, { error: "unauthorized" });
  if (!limiter.allow(device.deviceId)) return json(429, { error: "rate_limited" });

  const data = await loadProfile(device.userId);
  const age = ageFromBirth(data.profile?.date_of_birth ?? null);
  return json(200, { card: toWatchCard(data, age) });
}
