import { describe, it, expect } from 'vitest';
import { validatePinChange } from '@/lib/admin/pin-change';

describe('validatePinChange', () => {
  it('accepts a 4 digit code that differs from the other kind', () => {
    expect(validatePinChange('staff', '1234', false)).toBe('ok');
    expect(validatePinChange('admin', '5678', false)).toBe('ok');
  });
  it('rejects malformed codes', () => {
    for (const bad of ['', '123', '12345', 'abcd', '12 4']) {
      expect(validatePinChange('staff', bad, false)).toBe('invalid');
    }
  });
  it('rejects an unknown kind', () => {
    expect(validatePinChange('owner', '1234', false)).toBe('invalid');
  });
  it('rejects a code equal to the other kind', () => {
    expect(validatePinChange('staff', '1234', true)).toBe('same-as-other');
  });
});
