// Pure helpers: encrypting the stored Google refresh token and signing the OAuth "state". No path aliases (testable).
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const key = (secret: string, purpose: string) => createHash("sha256").update(`${purpose}\u0000${secret}`).digest();

/** AES-256-GCM. The format is "v1.<iv>.<tag>.<ciphertext>", all base64url. */
export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(secret, "google-refresh-token"), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptSecret(blob: string, secret: string): string {
  const [v, iv, tag, ct] = blob.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("bad_secret_format");
  const d = createDecipheriv("aes-256-gcm", key(secret, "google-refresh-token"), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}

const STATE_TTL_MS = 10 * 60_000;
const sign = (payload: string, secret: string) => createHmac("sha256", key(secret, "google-oauth-state")).update(payload).digest("base64url");

/** The OAuth state ties the round trip to one signed-in user and a short time window. */
export function makeState(userId: string, secret: string, now = Date.now()): string {
  const payload = `${userId}.${now + STATE_TTL_MS}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function checkState(state: string | null, userId: string, secret: string, now = Date.now()): boolean {
  if (!state) return false;
  const i = state.lastIndexOf(".");
  if (i < 0) return false;
  const payload = state.slice(0, i);
  const given = Buffer.from(state.slice(i + 1));
  const want = Buffer.from(sign(payload, secret));
  if (given.length !== want.length || !timingSafeEqual(given, want)) return false;
  const [uid, exp] = payload.split(".");
  return uid === userId && Number(exp) > now;
}

/** Reads the e-mail claim of an id_token received straight from Google's token endpoint over TLS. */
export function emailFromIdToken(idToken: string | undefined | null): string | null {
  try {
    const body = JSON.parse(Buffer.from(String(idToken).split(".")[1], "base64url").toString("utf8"));
    return typeof body.email === "string" ? body.email : null;
  } catch {
    return null;
  }
}
