import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '@/lib/admin/rate-limit';

describe('rate limiter', () => {
  it('locks after 5 failures within the window, then unlocks', () => {
    let t = 0;
    const rl = createRateLimiter({ max: 5, windowMs: 600_000, lockMs: 600_000, now: () => t });
    for (let i = 0; i < 4; i++) { rl.fail('ip'); }
    expect(rl.check('ip').allowed).toBe(true);
    expect(rl.fail('ip')).toBe(0);
    expect(rl.check('ip').allowed).toBe(false);
    t = 600_001;
    expect(rl.check('ip').allowed).toBe(true);
  });

  it('forgets failures older than the window', () => {
    let t = 0;
    const rl = createRateLimiter({ max: 5, windowMs: 600_000, lockMs: 600_000, now: () => t });
    for (let i = 0; i < 4; i++) rl.fail('ip');
    t = 700_000;
    expect(rl.fail('ip')).toBe(4);
  });

  it('reset clears a key; keys are independent', () => {
    const rl = createRateLimiter({ max: 5, windowMs: 1000, lockMs: 1000, now: () => 0 });
    for (let i = 0; i < 5; i++) rl.fail('a');
    expect(rl.check('b').allowed).toBe(true);
    rl.reset('a');
    expect(rl.check('a').allowed).toBe(true);
  });

  it('starts counting fresh after a lock expires', () => {
    let t = 0;
    const rl = createRateLimiter({ max: 5, windowMs: 600_000, lockMs: 600_000, now: () => t });
    for (let i = 0; i < 5; i++) rl.fail('ip');
    expect(rl.check('ip').allowed).toBe(false);
    t = 600_001;
    expect(rl.check('ip').allowed).toBe(true);
    for (let i = 0; i < 4; i++) rl.fail('ip');
    expect(rl.check('ip').allowed).toBe(true);
    expect(rl.fail('ip')).toBe(0);
    expect(rl.check('ip').allowed).toBe(false);
  });
});
