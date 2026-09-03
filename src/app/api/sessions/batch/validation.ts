/**
 * Pure request-validation helpers for batch check-in.
 *
 * Split out of route.ts so the two safety checks below can be unit tested
 * without a database: callers pass in rows already fetched by the route.
 */

export interface BatchEntry {
  purchase_id: string;
  child_id: string;
}

export interface OwnershipPurchase {
  id: string;
  customer_id: string;
}

const OWNERSHIP_MISMATCH_MESSAGE =
  'One or more passes or children in this check-in do not belong to this account.';

/**
 * Verify every purchase_id and child_id in the batch actually belongs to the
 * customer making the request.
 *
 * `createAdminClient()` bypasses RLS and this route is unauthenticated at the
 * middleware level, so without this check a caller could supply any
 * combination of customer_id / purchase_id / child_id and the insert (and the
 * punch-deducting trigger) would go through regardless of who actually owns
 * what -- draining one family's card with another family's check-in.
 *
 * Returns one generic message on any mismatch and never says which id was
 * wrong, so the endpoint can't be used to probe for ids that belong to
 * someone else.
 */
export function checkBatchOwnership(
  customerId: string,
  entries: BatchEntry[],
  purchases: OwnershipPurchase[],
  customerChildIds: string[]
): string | null {
  const purchaseOwners = new Map(purchases.map((p) => [p.id, p.customer_id]));
  const ownedChildIds = new Set(customerChildIds);

  for (const entry of entries) {
    if (purchaseOwners.get(entry.purchase_id) !== customerId) {
      return OWNERSHIP_MISMATCH_MESSAGE;
    }
    if (!ownedChildIds.has(entry.child_id)) {
      return OWNERSHIP_MISMATCH_MESSAGE;
    }
  }

  return null;
}

export interface CapacityPurchase {
  id: string;
  total_sessions: number;
  used_sessions: number;
}

/**
 * Verify no single purchase is asked to cover more check-ins in this one
 * batch than it has punches left.
 *
 * The AFTER INSERT trigger deducts a punch per session and flips status to
 * 'used' once exhausted, but it does not reject the insert -- so without this
 * check a card with 1 punch left could check in 3 children in a single call.
 * This is a safety net: the intended path is that the POS picker never offers
 * more entries against a card than it has punches for.
 *
 * Unlimited monthly passes carry total_sessions = 999 and are drawn on the
 * same way, so `remaining >= count` is correct for them too -- a batch is
 * capped at 12 entries by the request schema, which never exceeds a
 * remaining balance that starts at 999.
 */
export function checkBatchCapacity(
  entries: BatchEntry[],
  purchases: CapacityPurchase[]
): string | null {
  const purchaseById = new Map(purchases.map((p) => [p.id, p]));
  const drawCounts = new Map<string, number>();

  for (const entry of entries) {
    drawCounts.set(entry.purchase_id, (drawCounts.get(entry.purchase_id) ?? 0) + 1);
  }

  for (const [purchaseId, count] of drawCounts) {
    const purchase = purchaseById.get(purchaseId);
    // A missing purchase here means it failed the ownership check already;
    // this function only guards capacity, not existence.
    if (!purchase) continue;

    const remaining = purchase.total_sessions - purchase.used_sessions;
    if (count > remaining) {
      return 'This pass does not have enough punches left for this check-in.';
    }
  }

  return null;
}
