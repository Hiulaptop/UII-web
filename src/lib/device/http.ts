import type { ZodType } from "zod";

export const json = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export const clientIp = (req: Request) =>
  req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

// Reads at most `max` bytes of JSON so an oversized body cannot exhaust memory.
export async function readJson<T>(req: Request, max: number, schema: ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > max) return { ok: false, res: json(413, { error: "payload_too_large" }) };

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, res: json(400, { error: "bad_request" }) };
  }
  if (text.length > max) return { ok: false, res: json(413, { error: "payload_too_large" }) };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, res: json(400, { error: "invalid_json" }) };
  }
  const result = schema.safeParse(parsed);
  if (!result.success) return { ok: false, res: json(422, { error: "invalid_body" }) };
  return { ok: true, data: result.data };
}
