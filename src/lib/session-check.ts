// Remembers for a few minutes that a user still exists, so the session check does not query the database on every
// request (the proxy runs on every page view and should stay cheap). Pure: the lookup and the clock are passed in.
export function createExistsCache(lookup: (id: string) => Promise<boolean>, ttlMs: number, now: () => number = Date.now) {
  const seen = new Map<string, number>();
  return {
    async exists(id: string): Promise<boolean> {
      const t = seen.get(id);
      if (t !== undefined && now() - t < ttlMs) return true;
      const ok = await lookup(id);
      if (ok) seen.set(id, now());
      else seen.delete(id);
      return ok;
    },
    /** Called when an account is deleted, so the cache cannot keep its sessions alive. */
    forget(id: string) {
      seen.delete(id);
    },
  };
}
