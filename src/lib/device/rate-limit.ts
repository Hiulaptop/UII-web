// Sliding-window limiter kept in memory. Fine for one server process; move to a shared store before scaling out.
export type Limiter = { allow: (key: string, now?: number) => boolean; size: () => number };

export function createLimiter(limit: number, windowMs: number): Limiter {
  const hits = new Map<string, number[]>();

  const prune = (now: number) => {
    for (const [k, arr] of hits) {
      const fresh = arr.filter((t) => now - t < windowMs);
      if (fresh.length) hits.set(k, fresh);
      else hits.delete(k);
    }
  };

  return {
    allow(key, now = Date.now()) {
      const fresh = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (fresh.length >= limit) {
        hits.set(key, fresh);
        return false;
      }
      fresh.push(now);
      hits.set(key, fresh);
      if (hits.size > 10_000) prune(now);
      return true;
    },
    size: () => hits.size,
  };
}
