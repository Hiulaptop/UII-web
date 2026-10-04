// Pure helpers for account settings (no path aliases: they run under plain Node for tests).

/** Deleting an account needs the wearer to type their own email, so a stray tap or a script cannot do it. */
export function confirmationMatches(input: unknown, email: string): boolean {
  return typeof input === "string" && input.trim().toLowerCase() === email.trim().toLowerCase() && email.trim() !== "";
}

export function exportFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `uii-du-lieu-${now.getUTCFullYear()}-${p(now.getUTCMonth() + 1)}-${p(now.getUTCDate())}.json`;
}

/** Fields that must never leave the server in an export, whatever table they come from. */
const SECRET_KEYS = new Set(["token_hash", "code_hash", "push_token", "google_sub"]);

export function stripSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripSecrets) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !SECRET_KEYS.has(k))
        .map(([k, v]) => [k, stripSecrets(v)]),
    ) as T;
  }
  return value;
}
