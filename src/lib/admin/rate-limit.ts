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
    // Synchronous on purpose: no await between the lock check and the push, so a
    // parallel burst cannot slip past the limit while a slow hash compare runs.
    attempt(key: string): { allowed: boolean; retryAfterMs: number; remaining: number } {
      const t = now();
      const e = get(key);
      if (e.lockedUntil > t) return { allowed: false, retryAfterMs: e.lockedUntil - t, remaining: 0 };
      e.fails = e.fails.filter(f => t - f < opts.windowMs);
      e.fails.push(t);
      if (e.fails.length >= opts.max) { e.lockedUntil = t + opts.lockMs; e.fails = []; }
      map.set(key, e);
      return { allowed: true, retryAfterMs: 0, remaining: e.lockedUntil > t ? 0 : opts.max - e.fails.length };
    },
    reset(key: string) { map.delete(key); },
  };
}
