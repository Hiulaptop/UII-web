// Pure helpers for device credentials. No path aliases, so they run under plain Node for tests.
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

export const TOKEN_PREFIX = "uii_";
const BEARER_RE = /^Bearer\s+(uii_[A-Za-z0-9_-]{43})$/;

// 256 bits of randomness; only its SHA-256 is stored, so a database leak does not leak working tokens.
export function newDeviceToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

export function parseBearer(header: string | null | undefined): string | null {
  const m = header ? BEARER_RE.exec(header.trim()) : null;
  return m ? m[1] : null;
}

// 8 digits typed on a watch; safe because codes are single-use, short-lived and attempts are rate limited.
export function newPairingCode(): string {
  return String(randomInt(0, 100_000_000)).padStart(8, "0");
}

export function normalizeCode(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{8}$/.test(digits) ? digits : null;
}

export const formatCode = (code: string): string => `${code.slice(0, 4)} ${code.slice(4)}`;

// Keyed hash: the 10^8 code space is small, so a plain hash could be reversed from a leaked table.
export const hashCode = (code: string, secret: string): string => createHmac("sha256", secret).update(code).digest("hex");
