import { describe, expect, it } from 'vitest';
import { decideRole } from '@/lib/auth/roleAccess';

describe('decideRole', () => {
  it('refuses anyone without a session', () => {
    expect(decideRole(null, null, 'staff')).toBe('unauthenticated');
    expect(decideRole(null, 'admin', 'admin')).toBe('unauthenticated');
  });

  it('lets staff and admins into staff routes', () => {
    expect(decideRole('u', 'staff', 'staff')).toBe('allow');
    expect(decideRole('u', 'admin', 'staff')).toBe('allow');
  });

  it('keeps admin routes to admins', () => {
    expect(decideRole('u', 'admin', 'admin')).toBe('allow');
    expect(decideRole('u', 'staff', 'admin')).toBe('forbidden');
  });

  it('refuses customers and sessions with no role', () => {
    expect(decideRole('u', 'customer', 'staff')).toBe('forbidden');
    expect(decideRole('u', null, 'staff')).toBe('forbidden');
    expect(decideRole('u', 'customer', 'admin')).toBe('forbidden');
  });
});
