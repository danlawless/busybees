import { describe, it, expect } from 'vitest';
import { createRateLimiter, gateAttempt } from '@/lib/admin/rate-limit';

describe('rate limiter', () => {
  it('locks after 5 failures within the window, then unlocks', () => {
    let t = 0;
    const rl = createRateLimiter({ max: 5, windowMs: 600_000, lockMs: 600_000, now: () => t });
    for (let i = 0; i < 4; i++) { rl.attempt('ip'); }
    expect(rl.check('ip').allowed).toBe(true);
    expect(rl.attempt('ip').remaining).toBe(0);
    expect(rl.check('ip').allowed).toBe(false);
    t = 600_001;
    expect(rl.check('ip').allowed).toBe(true);
  });

  it('forgets failures older than the window', () => {
    let t = 0;
    const rl = createRateLimiter({ max: 5, windowMs: 600_000, lockMs: 600_000, now: () => t });
    for (let i = 0; i < 4; i++) rl.attempt('ip');
    t = 700_000;
    expect(rl.attempt('ip').remaining).toBe(4);
  });

  it('reset clears a key; keys are independent', () => {
    const rl = createRateLimiter({ max: 5, windowMs: 1000, lockMs: 1000, now: () => 0 });
    for (let i = 0; i < 5; i++) rl.attempt('a');
    expect(rl.check('b').allowed).toBe(true);
    rl.reset('a');
    expect(rl.check('a').allowed).toBe(true);
  });

  it('starts counting fresh after a lock expires', () => {
    let t = 0;
    const rl = createRateLimiter({ max: 5, windowMs: 600_000, lockMs: 600_000, now: () => t });
    for (let i = 0; i < 5; i++) rl.attempt('ip');
    expect(rl.check('ip').allowed).toBe(false);
    t = 600_001;
    expect(rl.check('ip').allowed).toBe(true);
    for (let i = 0; i < 4; i++) rl.attempt('ip');
    expect(rl.check('ip').allowed).toBe(true);
    expect(rl.attempt('ip').remaining).toBe(0);
    expect(rl.check('ip').allowed).toBe(false);
  });

  it('a synchronous burst of 10 attempts allows exactly 5', () => {
    const rl = createRateLimiter({ max: 5, windowMs: 600_000, lockMs: 600_000, now: () => 0 });
    const results = Array.from({ length: 10 }, () => rl.attempt('ip'));
    expect(results.filter(r => r.allowed)).toHaveLength(5);
    expect(results.filter(r => !r.allowed)).toHaveLength(5);
  });

  it('a shared global limiter locks on the 50th attempt even when keys rotate', () => {
    const global = createRateLimiter({ max: 50, windowMs: 600_000, lockMs: 600_000, now: () => 0 });
    for (let i = 0; i < 49; i++) expect(global.attempt('all').allowed).toBe(true);
    // each attempt would come from a fresh per-client key; the global key is constant
    const perClient = createRateLimiter({ max: 5, windowMs: 600_000, lockMs: 600_000, now: () => 0 });
    for (let i = 0; i < 49; i++) expect(perClient.attempt(`spoof-${i}`).remaining).toBe(4);
    expect(global.attempt('all').remaining).toBe(0);
    expect(global.check('all').allowed).toBe(false);
  });

  it('a locked client does not spend the shop-wide budget', () => {
    const per = createRateLimiter({ max: 5, windowMs: 600_000, lockMs: 600_000, now: () => 0 });
    const glob = createRateLimiter({ max: 10, windowMs: 600_000, lockMs: 600_000, now: () => 0 });
    for (let i = 0; i < 10; i++) gateAttempt(per, glob, 'one-host');
    expect(gateAttempt(per, glob, 'one-host').allowed).toBe(false);
    // 5 recorded; this probe is the 6th, leaving 4 of 10
    expect(glob.attempt('all').remaining).toBe(4);
  });

  it('gate refuses with the global retryAfter when the shop-wide cap trips', () => {
    const per = createRateLimiter({ max: 5, windowMs: 1000, lockMs: 1000, now: () => 0 });
    const glob = createRateLimiter({ max: 2, windowMs: 1000, lockMs: 5000, now: () => 0 });
    gateAttempt(per, glob, 'a');
    gateAttempt(per, glob, 'b');
    expect(gateAttempt(per, glob, 'c')).toEqual({ allowed: false, retryAfterMs: 5000, remaining: 0 });
  });
});
