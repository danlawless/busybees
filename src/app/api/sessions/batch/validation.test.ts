import { describe, expect, it } from 'vitest';
import { checkBatchOwnership, checkBatchCapacity } from './validation';
import type { BatchEntry, OwnershipPurchase, CapacityPurchase } from './validation';

const CUSTOMER = 'customer-1';
const OTHER_CUSTOMER = 'customer-2';

describe('checkBatchOwnership', () => {
  const purchase: OwnershipPurchase = { id: 'purchase-1', customer_id: CUSTOMER };
  const entries: BatchEntry[] = [{ purchase_id: 'purchase-1', child_id: 'child-1' }];

  it('passes when every purchase and child belongs to the requesting customer', () => {
    const result = checkBatchOwnership(CUSTOMER, entries, [purchase], ['child-1']);
    expect(result).toBeNull();
  });

  it('rejects when a purchase belongs to a different customer', () => {
    const foreignPurchase: OwnershipPurchase = { id: 'purchase-1', customer_id: OTHER_CUSTOMER };
    const result = checkBatchOwnership(CUSTOMER, entries, [foreignPurchase], ['child-1']);
    expect(result).not.toBeNull();
  });

  it('rejects when a child does not belong to the requesting customer', () => {
    // child-1 is not in the customer's own children list -- e.g. it belongs
    // to another account, or does not exist at all.
    const result = checkBatchOwnership(CUSTOMER, entries, [purchase], ['child-99']);
    expect(result).not.toBeNull();
  });

  it('rejects the whole batch if any one entry fails, even when others are valid', () => {
    const mixedEntries: BatchEntry[] = [
      { purchase_id: 'purchase-1', child_id: 'child-1' },
      { purchase_id: 'purchase-1', child_id: 'not-mine' },
    ];
    const result = checkBatchOwnership(CUSTOMER, mixedEntries, [purchase], ['child-1']);
    expect(result).not.toBeNull();
  });

  it('never echoes back which id failed', () => {
    const foreignPurchase: OwnershipPurchase = { id: 'purchase-1', customer_id: OTHER_CUSTOMER };
    const result = checkBatchOwnership(CUSTOMER, entries, [foreignPurchase], ['child-1']);
    expect(result).not.toMatch(/purchase-1|child-1|customer-1|customer-2/);
  });

  it('produces the same message for a purchase mismatch and a child mismatch', () => {
    const foreignPurchase: OwnershipPurchase = { id: 'purchase-1', customer_id: OTHER_CUSTOMER };
    const purchaseMismatch = checkBatchOwnership(CUSTOMER, entries, [foreignPurchase], ['child-1']);
    const childMismatch = checkBatchOwnership(CUSTOMER, entries, [purchase], ['child-99']);
    expect(purchaseMismatch).toBe(childMismatch);
  });
});

describe('checkBatchCapacity', () => {
  it('allows a batch that draws exactly the punches remaining', () => {
    const purchase: CapacityPurchase = { id: 'p1', total_sessions: 10, used_sessions: 7 };
    const entries: BatchEntry[] = [
      { purchase_id: 'p1', child_id: 'c1' },
      { purchase_id: 'p1', child_id: 'c2' },
      { purchase_id: 'p1', child_id: 'c3' },
    ];
    expect(checkBatchCapacity(entries, [purchase])).toBeNull();
  });

  it('rejects a batch that draws more punches than remain on one card', () => {
    // 1 punch left, 3 children trying to check in against it in one call.
    const purchase: CapacityPurchase = { id: 'p1', total_sessions: 10, used_sessions: 9 };
    const entries: BatchEntry[] = [
      { purchase_id: 'p1', child_id: 'c1' },
      { purchase_id: 'p1', child_id: 'c2' },
      { purchase_id: 'p1', child_id: 'c3' },
    ];
    expect(checkBatchCapacity(entries, [purchase])).not.toBeNull();
  });

  it('does not let a well-funded pass mask an over-drawn one in the same batch', () => {
    const purchases: CapacityPurchase[] = [
      { id: 'well-funded', total_sessions: 10, used_sessions: 0 },
      { id: 'over-drawn', total_sessions: 10, used_sessions: 9 },
    ];
    const entries: BatchEntry[] = [
      { purchase_id: 'well-funded', child_id: 'c1' },
      { purchase_id: 'over-drawn', child_id: 'c2' },
      { purchase_id: 'over-drawn', child_id: 'c3' },
    ];
    expect(checkBatchCapacity(entries, purchases)).not.toBeNull();
  });

  it('never rejects an unlimited monthly pass (total_sessions = 999) for a normal-sized batch', () => {
    const purchase: CapacityPurchase = { id: 'monthly', total_sessions: 999, used_sessions: 950 };
    const entries: BatchEntry[] = [
      { purchase_id: 'monthly', child_id: 'c1' },
      { purchase_id: 'monthly', child_id: 'c2' },
      { purchase_id: 'monthly', child_id: 'c3' },
    ];
    expect(checkBatchCapacity(entries, [purchase])).toBeNull();
  });

  it('still rejects an unlimited monthly pass once it is actually exhausted', () => {
    const purchase: CapacityPurchase = { id: 'monthly', total_sessions: 999, used_sessions: 999 };
    const entries: BatchEntry[] = [{ purchase_id: 'monthly', child_id: 'c1' }];
    expect(checkBatchCapacity(entries, [purchase])).not.toBeNull();
  });
});
