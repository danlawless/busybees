import { describe, expect, it } from 'vitest';
import { decideUndoAccess, pinMatches } from './undoAccess';
import type { UndoRequest } from './undoAccess';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const OTHER_CUSTOMER = '22222222-2222-4222-8222-222222222222';
const STAFF = '33333333-3333-4333-8333-333333333333';
const PIN = '4821';

const base: UndoRequest = {
  caller: { userId: CUSTOMER, role: 'customer' },
  sessionOwnerId: CUSTOMER,
  configuredPin: PIN,
  suppliedPin: PIN,
};

describe('decideUndoAccess', () => {
  it('rejects a caller with no session at all', () => {
    expect(decideUndoAccess({ ...base, caller: { userId: null, role: null } })).toBe('unauthenticated');
  });

  it('allows staff and admin without a PIN', () => {
    for (const role of ['staff', 'admin'] as const) {
      expect(
        decideUndoAccess({ ...base, caller: { userId: STAFF, role }, suppliedPin: null })
      ).toBe('allow');
    }
  });

  it('allows the front desk to undo the looked-up customer\'s own check-in with the POS PIN', () => {
    // The phone lookup signs the POS in as the customer, so this is the
    // front desk's path: the customer's session plus the staff PIN.
    expect(decideUndoAccess(base)).toBe('allow');
  });

  it('refuses a customer session without the PIN', () => {
    expect(decideUndoAccess({ ...base, suppliedPin: null })).toBe('pin_required');
    expect(decideUndoAccess({ ...base, suppliedPin: '' })).toBe('pin_required');
  });

  it('refuses a customer session with the wrong PIN', () => {
    expect(decideUndoAccess({ ...base, suppliedPin: '0000' })).toBe('wrong_pin');
  });

  it('never lets the PIN undo someone else\'s check-in', () => {
    expect(decideUndoAccess({ ...base, sessionOwnerId: OTHER_CUSTOMER })).toBe('forbidden');
  });

  it('refuses when the check-in does not exist', () => {
    expect(decideUndoAccess({ ...base, sessionOwnerId: null })).toBe('forbidden');
  });

  it('stays staff-only when no POS PIN is configured', () => {
    // With no PIN set the POS lock screen is open; undo must not open with it.
    expect(decideUndoAccess({ ...base, configuredPin: null })).toBe('forbidden');
    expect(decideUndoAccess({ ...base, configuredPin: '' })).toBe('forbidden');
  });
});

describe('pinMatches', () => {
  it('matches only the exact PIN', () => {
    expect(pinMatches('4821', '4821')).toBe(true);
    expect(pinMatches('4822', '4821')).toBe(false);
    expect(pinMatches('482', '4821')).toBe(false);
    expect(pinMatches('48210', '4821')).toBe(false);
  });
});
