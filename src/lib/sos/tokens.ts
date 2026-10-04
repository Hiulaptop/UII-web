// Pure helpers for the public SOS link. No path aliases, so they run under plain Node for tests.
import { createHash, randomBytes } from "node:crypto";

const RE = /^sos_[A-Za-z0-9_-]{43}$/;

// 256 bits of randomness; only the SHA-256 is stored, so a database leak does not leak working links.
export const newSosToken = (): string => "sos_" + randomBytes(32).toString("base64url");
export const isSosToken = (t: string): boolean => RE.test(t);
export const hashSosToken = (t: string): string => createHash("sha256").update(t).digest("hex");

export const TTL_CHOICES = {
  "30d": 30 * 86_400_000,
  "1y": 365 * 86_400_000,
  never: null,
} as const;
export type TtlChoice = keyof typeof TTL_CHOICES;

export function expiryFor(choice: string, now = Date.now()): { ok: true; expiresAt: string | null } | { ok: false } {
  if (!Object.hasOwn(TTL_CHOICES, choice)) return { ok: false };
  const ms = TTL_CHOICES[choice as TtlChoice];
  return { ok: true, expiresAt: ms === null ? null : new Date(now + ms).toISOString() };
}

export function ageFromBirth(dob: string | null, now = Date.now()): number | null {
  if (!dob) return null;
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return null;
  const n = new Date(now);
  let age = n.getUTCFullYear() - b.getUTCFullYear();
  if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}
