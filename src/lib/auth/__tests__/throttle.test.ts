import { describe, expect, it } from 'vitest';
import { decideThrottle, LIMITS } from '@/lib/auth/throttle';

describe('decideThrottle', () => {
  const pin = LIMITS['admin-pin'];

  it('lets attempts through under both limits', () => {
    expect(decideThrottle(0, 0, pin)).toEqual({ allowed: true });
    expect(decideThrottle(pin.perAddress - 1, pin.overall - 1, pin)).toEqual({ allowed: true });
  });

  it('blocks one address that keeps guessing', () => {
    expect(decideThrottle(pin.perAddress, 0, pin)).toEqual({ allowed: false, reason: 'address' });
  });

  it('blocks everyone when many addresses guess together', () => {
    expect(decideThrottle(0, pin.overall, pin)).toEqual({ allowed: false, reason: 'overall' });
  });

  it('gives PINs tighter limits than passwords', () => {
    expect(LIMITS['admin-pin'].perAddress).toBeLessThan(LIMITS['web-login'].perAddress);
    expect(LIMITS['pos-pin'].overall).toBeLessThan(LIMITS['web-login'].overall);
  });
});
