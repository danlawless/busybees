import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hiddenPasswordFor, throwawayPassword } from '@/lib/auth/hiddenPassword';

describe('hiddenPasswordFor', () => {
  const saved = process.env.AUTH_PASSWORD_SECRET;
  beforeEach(() => { process.env.AUTH_PASSWORD_SECRET = 'test-secret'; });
  afterEach(() => { process.env.AUTH_PASSWORD_SECRET = saved; });

  it('is stable per account and different between accounts', () => {
    expect(hiddenPasswordFor('user-a')).toBe(hiddenPasswordFor('user-a'));
    expect(hiddenPasswordFor('user-a')).not.toBe(hiddenPasswordFor('user-b'));
  });

  it('cannot be worked out without the server secret', () => {
    const withSecret = hiddenPasswordFor('user-a');
    process.env.AUTH_PASSWORD_SECRET = 'a-different-secret';
    expect(hiddenPasswordFor('user-a')).not.toBe(withSecret);
  });

  it('looks nothing like the old phone patterns', () => {
    expect(hiddenPasswordFor('user-a')).not.toMatch(/PHONE-|STAFF-/);
    expect(hiddenPasswordFor('user-a').length).toBeGreaterThanOrEqual(40);
    expect(throwawayPassword()).not.toBe(throwawayPassword());
  });
});
