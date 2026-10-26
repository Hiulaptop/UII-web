// Which of two fixes is the better "current position" of an alert: the newer one, and for the same moment the more accurate one.
export type Fix = { t: number; accuracy: number | null };

export function isBetterFix(candidate: Fix, current: Fix | null): boolean {
  if (!current) return true;
  if (candidate.t !== current.t) return candidate.t > current.t;
  // Same moment: a missing accuracy counts as the worst.
  return (candidate.accuracy ?? Infinity) < (current.accuracy ?? Infinity);
}
