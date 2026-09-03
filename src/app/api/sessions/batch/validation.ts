/**
 * Pure request-validation helpers for batch check-in.
 *
 * Split out of route.ts so the safety checks below can be unit tested without
 * a database: callers pass in rows already fetched by the route.
 */

export interface BatchEntry {
  purchase_id: string;
  child_id: string;
}

export interface OwnershipPurchase {
  id: string;
  customer_id: string;
}

export const OWNERSHIP_MISMATCH_MESSAGE =
  'One or more passes or children in this check-in do not belong to this account.';

/**
 * Verify every purchase_id and child_id in the batch actually belongs to the
 * customer making the request.
 *
 * The route requires a staff session, but that only says the caller works
 * here. `createAdminClient()` bypasses RLS, so without this check any
 * combination of customer_id / purchase_id / child_id would insert -- and the
 * punch-deducting trigger fire -- regardless of who actually owns what,
 * draining one family's card with another family's check-in.
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

const ALREADY_CHECKED_IN_MESSAGE =
  'One or more of these children are already checked in. Refresh the screen — if they are inside, this check-in already went through.';

/**
 * Reject a batch that names the same child twice.
 *
 * A child can only be in the building once, so a repeated child is never a
 * legitimate request -- it is a double-tap or a body assembled twice. Left
 * alone it opens two sessions for one child and spends two punches.
 *
 * Broader than "the same {purchase_id, child_id} pair twice" on purpose: the
 * same child against two *different* passes is just as wrong, and costs two
 * punches rather than one.
 */
export function checkNoDuplicateChildren(entries: BatchEntry[]): string | null {
  const seen = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.child_id)) {
      return ALREADY_CHECKED_IN_MESSAGE;
    }
    seen.add(entry.child_id);
  }

  return null;
}

/**
 * Reject a batch for a child who already has a session open.
 *
 * This is what makes check-in idempotent under a lost response. The POS runs
 * on wifi: the batch can commit server-side and the reply never arrive, and
 * staff -- shown a failure -- press Confirm again. Nothing else stops the
 * second press. `checkBatchCapacity` re-reads `used_sessions` fresh and, on a
 * card with punches left, happily allows the same children through a second
 * time: another punch each, another open session each. Neither is visible
 * until someone reconciles the card.
 *
 * A child who is already inside cannot legitimately be checked in again, so
 * rejecting turns the retry into a no-op instead of a second spend. The
 * corollary is that this must be evaluated against a *fresh* read of open
 * sessions taken in the same request, not against anything the client sent.
 */
export function checkNoOpenSessions(
  entries: BatchEntry[],
  childIdsWithOpenSessions: readonly string[]
): string | null {
  const open = new Set(childIdsWithOpenSessions);

  for (const entry of entries) {
    if (open.has(entry.child_id)) {
      return ALREADY_CHECKED_IN_MESSAGE;
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
