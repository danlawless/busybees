import { describe, expect, it } from 'vitest';
import { decideThrottle, LIMITS, normalizeAddress } from '@/lib/auth/throttle';

describe('decideThrottle', () => {
  const pin = LIMITS['admin-pin'];

  it('allows up to the limit, counting the attempt being judged', () => {
    expect(decideThrottle(1, 1, pin)).toEqual({ allowed: true });
    expect(decideThrottle(pin.perKey, pin.overall!, pin)).toEqual({ allowed: true });
  });

  it('blocks one address that keeps guessing', () => {
    expect(decideThrottle(pin.perKey + 1, 0, pin)).toEqual({ allowed: false, reason: 'key' });
  });

  it('blocks a PIN check when many addresses guess together', () => {
    expect(decideThrottle(1, pin.overall! + 1, pin)).toEqual({ allowed: false, reason: 'overall' });
  });

  it('never blocks password logins site-wide, so nobody can lock every customer out', () => {
    expect(LIMITS['web-login'].overall).toBeNull();
    expect(decideThrottle(1, 1_000_000, LIMITS['web-login'])).toEqual({ allowed: true });
  });

  it('gives PINs tighter per-address limits than passwords', () => {
    expect(LIMITS['admin-pin'].perKey).toBeLessThan(LIMITS['web-login'].perKey);
  });
});

describe('normalizeAddress', () => {
  it('keeps IPv4 as it is', () => {
    expect(normalizeAddress('203.0.113.7')).toBe('203.0.113.7');
  });

  it('groups IPv6 by /64, so stepping through one network does not help', () => {
    expect(normalizeAddress('2001:db8:1:2:aaaa::1')).toBe('2001:db8:1:2::/64');
    expect(normalizeAddress('2001:db8:1:2:bbbb:cccc:dddd:eeee')).toBe('2001:db8:1:2::/64');
  });

  it('expands shortened IPv6 before grouping, and unwraps IPv4-mapped addresses', () => {
    expect(normalizeAddress('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(normalizeAddress('2001:DB8:0001:0002::5')).toBe('2001:db8:1:2::/64');
    expect(normalizeAddress('::ffff:203.0.113.7')).toBe('203.0.113.7');
  });
});

describe('guest-pass lookups', () => {
  it('limits guest-pass lookups per address without an overall cap', () => {
    expect(LIMITS['guest-lookup']).toEqual({ perKey: 30, overall: null, windowMinutes: 60 });
  });
});
