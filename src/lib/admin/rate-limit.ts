type Entry = { fails: number[]; lockedUntil: number };

export function createRateLimiter(opts: { max: number; windowMs: number; lockMs: number; now?: () => number }) {
  const now = opts.now ?? Date.now;
  const map = new Map<string, Entry>();
  const get = (k: string) => map.get(k) ?? { fails: [], lockedUntil: 0 };

  return {
    check(key: string) {
      const e = get(key);
      const t = now();
      return e.lockedUntil > t ? { allowed: false, retryAfterMs: e.lockedUntil - t } : { allowed: true, retryAfterMs: 0 };
    },
    fail(key: string): number {
      const t = now();
      const e = get(key);
      e.fails = e.fails.filter(f => t - f < opts.windowMs);
      e.fails.push(t);
      if (e.fails.length >= opts.max) { e.lockedUntil = t + opts.lockMs; e.fails = []; }
      map.set(key, e);
      return e.lockedUntil > t ? 0 : opts.max - e.fails.length;
    },
    reset(key: string) { map.delete(key); },
  };
}
