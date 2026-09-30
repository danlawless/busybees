import { describe, expect, it } from 'vitest';
import { decideAccountAccess } from './accountAccess';
import type { AccountCaller } from './accountAccess';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const OTHER_CUSTOMER = '22222222-2222-4222-8222-222222222222';
const STAFF = '33333333-3333-4333-8333-333333333333';

describe('decideAccountAccess', () => {
  it('rejects a caller with no session at all', () => {
    const anonymous: AccountCaller = { userId: null, role: null };
    expect(decideAccountAccess(anonymous, CUSTOMER)).toBe('unauthenticated');
  });

  it('allows staff to act on any account', () => {
    const staff: AccountCaller = { userId: STAFF, role: 'staff' };
    expect(decideAccountAccess(staff, CUSTOMER)).toBe('allow');
    expect(decideAccountAccess(staff, OTHER_CUSTOMER)).toBe('allow');
  });

  it('allows admin to act on any account', () => {
    const admin: AccountCaller = { userId: STAFF, role: 'admin' };
    expect(decideAccountAccess(admin, CUSTOMER)).toBe('allow');
    expect(decideAccountAccess(admin, OTHER_CUSTOMER)).toBe('allow');
  });

  it('allows a customer to act on their own account', () => {
    // The self-service path: `/api/auth/pos-login` signs the customer in, and
    // the check-in screen posts their own id as customer_id.
    const customer: AccountCaller = { userId: CUSTOMER, role: 'customer' };
    expect(decideAccountAccess(customer, CUSTOMER)).toBe('allow');
  });

  it('rejects a customer acting on a different account', () => {
    const customer: AccountCaller = { userId: CUSTOMER, role: 'customer' };
    expect(decideAccountAccess(customer, OTHER_CUSTOMER)).toBe('forbidden');
  });

  it('grants nothing on a missing users row beyond that account itself', () => {
    // A session whose `users` row cannot be read is not staff by default: it
    // falls through to the ownership test like any customer.
    const roleless: AccountCaller = { userId: CUSTOMER, role: null };
    expect(decideAccountAccess(roleless, CUSTOMER)).toBe('allow');
    expect(decideAccountAccess(roleless, OTHER_CUSTOMER)).toBe('forbidden');
  });
});
