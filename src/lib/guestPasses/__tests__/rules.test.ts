import { describe, it, expect } from 'vitest';
import {
  GUEST_PASS_ALLOWANCE,
  guestPassesOpen,
  normalizeChildName,
  decideGuestEligibility,
  decideGuestPassCaller,
  issueRefusalMessage,
  NOT_ELIGIBLE_MESSAGE,
} from '../rules';

describe('guestPassesOpen', () => {
  it('is closed one second before midnight Eastern on 1 Nov 2026', () => {
    expect(guestPassesOpen(new Date('2026-11-01T03:59:59Z'))).toBe(false);
  });
  it('opens at midnight Eastern on 1 Nov 2026 (still EDT, UTC-4)', () => {
    expect(guestPassesOpen(new Date('2026-11-01T04:00:00Z'))).toBe(true);
  });
});

describe('normalizeChildName', () => {
  it('ignores case, outer spaces and repeated inner spaces', () => {
    expect(normalizeChildName('  Mia   Rose ')).toBe(normalizeChildName('mia rose'));
  });
});

describe('decideGuestEligibility', () => {
  const empty = (userId: string) => ({ userId, role: 'customer', purchaseCount: 0 });

  it('no match is a new family', () => {
    expect(decideGuestEligibility([])).toEqual({ kind: 'new' });
  });
  it('an account with no purchases is eligible, matched however', () => {
    expect(decideGuestEligibility([empty('a'), empty('a')])).toEqual({ kind: 'existing', userId: 'a' });
  });
  it('any match with a purchase is not eligible, even if found only by email or child', () => {
    expect(
      decideGuestEligibility([empty('a'), { userId: 'b', role: 'customer', purchaseCount: 1 }])
    ).toEqual({ kind: 'not_eligible' });
  });
  it('a staff or admin account is never a guest', () => {
    expect(decideGuestEligibility([{ userId: 's', role: 'staff', purchaseCount: 0 }])).toEqual({
      kind: 'not_eligible',
    });
  });
  it('two different empty accounts is a conflict, not a guess', () => {
    expect(decideGuestEligibility([empty('a'), empty('b')])).toEqual({ kind: 'conflict' });
  });
});

describe('decideGuestPassCaller', () => {
  const member = { userId: 'm', role: 'customer' as const };
  const staff = { userId: 's', role: 'staff' as const };

  it('no session is unauthenticated', () => {
    expect(
      decideGuestPassCaller({ caller: { userId: null, role: null }, deviceApproved: true, requestedMemberId: null })
    ).toEqual({ kind: 'unauthenticated' });
  });
  it('a member on an approved POS device acts for themselves', () => {
    expect(decideGuestPassCaller({ caller: member, deviceApproved: true, requestedMemberId: null })).toEqual({
      kind: 'allow',
      memberId: 'm',
    });
  });
  it('a member at home (no approved device) is refused', () => {
    expect(decideGuestPassCaller({ caller: member, deviceApproved: false, requestedMemberId: null })).toEqual({
      kind: 'device_locked',
    });
  });
  it('a member cannot spend another member\'s passes', () => {
    expect(decideGuestPassCaller({ caller: member, deviceApproved: true, requestedMemberId: 'x' })).toEqual({
      kind: 'forbidden',
    });
  });
  it('staff must name the member', () => {
    expect(decideGuestPassCaller({ caller: staff, deviceApproved: false, requestedMemberId: null })).toEqual({
      kind: 'member_required',
    });
    expect(decideGuestPassCaller({ caller: staff, deviceApproved: false, requestedMemberId: 'm' })).toEqual({
      kind: 'allow',
      memberId: 'm',
    });
  });
});

describe('issueRefusalMessage', () => {
  it('maps not_new to the counter wording', () => {
    expect(issueRefusalMessage('not_new')).toBe(NOT_ELIGIBLE_MESSAGE);
  });
  it('mentions the allowance when none are left', () => {
    expect(issueRefusalMessage('none_left')).toContain(String(GUEST_PASS_ALLOWANCE));
  });
});
