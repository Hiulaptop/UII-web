import { auth } from "@/auth";
import { exportFileName } from "@/lib/account/confirm";
import { exportUserData } from "@/lib/account/service";
import { createLimiter } from "@/lib/device/rate-limit";

export const dynamic = "force-dynamic";

const limiter = createLimiter(5, 60 * 60_000); // five downloads an hour per account is plenty

export async function GET() {
  const uid = (await auth())?.user?.id;
  if (!uid) return new Response(null, { status: 401 });
  if (!limiter.allow(uid)) return new Response("Quá nhiều lần tải, thử lại sau.", { status: 429 });

  const data = await exportUserData(uid);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName(new Date())}"`,
      "Cache-Control": "no-store",
    },
  });
}
