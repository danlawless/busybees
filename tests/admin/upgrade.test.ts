import { describe, it, expect } from 'vitest';
import { needsUpgrade } from '@/lib/admin/upgrade';

describe('needsUpgrade', () => {
  it('staff on an owner page needs the prompt', () => {
    expect(needsUpgrade('/admin/reports', 'staff')).toBe(true);
  });
  it('staff on a staff page does not', () => {
    expect(needsUpgrade('/admin/parties', 'staff')).toBe(false);
    expect(needsUpgrade('/admin', 'staff')).toBe(false);
  });
  it('admin never needs it', () => {
    expect(needsUpgrade('/admin/reports', 'admin')).toBe(false);
  });
  it('fails closed on a missing pathname', () => {
    expect(needsUpgrade(null, 'staff')).toBe(true);
    expect(needsUpgrade('', 'staff')).toBe(true);
  });
});
