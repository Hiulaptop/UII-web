// In-process fan-out to browsers that hold an open event stream. The app runs as one Node process, so a plain map is
// enough; if it is ever scaled out, this is the one place to swap for Redis/Postgres LISTEN.
export type LiveEvent =
  | { kind: "alert"; alertId: string; type: string; severity: string; subject: string; at: string }
  | { kind: "alert_updated"; alertId: string; status: string };

type Listener = (e: LiveEvent) => void;

const g = globalThis as unknown as { __uiiHub?: Map<string, Set<Listener>> };
const listeners = (g.__uiiHub ??= new Map());

export function subscribe(userId: string, fn: Listener): () => void {
  let set = listeners.get(userId);
  if (!set) listeners.set(userId, (set = new Set()));
  set.add(fn);
  return () => {
    set.delete(fn);
    if (!set.size) listeners.delete(userId);
  };
}

/** @returns how many open streams the event reached. */
export function publish(userId: string, e: LiveEvent): number {
  const set = listeners.get(userId);
  if (!set) return 0;
  let n = 0;
  for (const fn of [...set]) {
    try {
      fn(e);
      n++;
    } catch {
      set.delete(fn);
    }
  }
  return n;
}

export const connectionCount = (userId: string) => listeners.get(userId)?.size ?? 0;
