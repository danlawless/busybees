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

// Real client identity for rate limiting. x-real-ip is set by the platform
// (Vercel) to the connecting client. Otherwise the LAST x-forwarded-for entry,
// the hop appended by the nearest proxy; earlier entries are client-supplied
// and spoofable, so they are never trusted.
export function clientKeyFrom(headers: Headers): string {
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real;
  const parts = (headers.get('x-forwarded-for') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || 'unknown';
}

type Limiter = ReturnType<typeof createRateLimiter>;

// Two-limiter gate. Per-client first: a client already locked is refused without
// touching the shop-wide budget, so one host cannot burn it alone.
export function gateAttempt(perClient: Limiter, global: Limiter, key: string): { allowed: boolean; retryAfterMs: number; remaining: number } {
  const gate = perClient.attempt(key);
  if (!gate.allowed) return gate;
  const all = global.attempt('all');
  if (!all.allowed) return { allowed: false, retryAfterMs: all.retryAfterMs, remaining: 0 };
  return gate;
}
