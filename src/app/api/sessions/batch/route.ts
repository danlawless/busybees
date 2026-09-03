/**
 * API Route: Batch check-in
 * POST - Open one session per child against the passes that cover them.
 *
 * A family on one punch card checks in as a unit: either every child gets in
 * or none does, so a partial failure never spends punches for children left
 * outside.
 *
 * Requires a caller entitled to the account being checked in: staff or admin
 * on any account, or the signed-in customer on their own. Since migration 052
 * the insert below spends a punch, so this cannot be left open -- but it is not
 * staff-only either, because a self-service device runs this screen signed in
 * as the customer. The POS PIN is a client-side screen lock and proves nothing
 * to the server. See `requireAccountAccess`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessions, getOpenSessionChildIdsAsAdmin } from '@/lib/services/sessions';
import { getPurchaseAsAdmin, updatePurchase } from '@/lib/services/purchases';
import { getCustomerChildIdsAsAdmin } from '@/lib/services/children';
import { requireAccountAccess } from '../requireAccountAccess';
import {
  checkBatchOwnership,
  checkBatchCapacity,
  checkNoDuplicateChildren,
  checkNoOpenSessions,
} from './validation';

const batchSchema = z.object({
  customer_id: z.string().uuid(),
  auto_checkout_time: z.string().datetime(),
  start_time: z.string().datetime().optional(),
  entries: z
    .array(z.object({ purchase_id: z.string().uuid(), child_id: z.string().uuid() }))
    .min(1)
    .max(12),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = batchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid check-in request', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { customer_id, auto_checkout_time, start_time, entries } = parsed.data;

    // Who may call, before anything is read or written. The account has to be
    // parsed out of the body first, so this sits below the schema check and
    // above every query.
    const denied = await requireAccountAccess(customer_id);
    if (denied) return denied;

    // A child named twice in one call would be checked in twice and charged
    // twice. Pure, so it runs before any database work.
    const duplicateError = checkNoDuplicateChildren(entries);
    if (duplicateError) {
      return NextResponse.json({ error: duplicateError }, { status: 409 });
    }

    // Every pass is checked before anything is inserted, so an expired card
    // cannot let part of a family through. Reads here use the admin client:
    // under RLS a row that exists but is invisible comes back as PGRST116,
    // exactly like a row that does not exist, and a gate that denies on
    // absence must not be fed a read that can report absence for an unrelated
    // reason -- see the comment on `getPurchaseAsAdmin`.
    const purchaseIds = [...new Set(entries.map((e) => e.purchase_id))];
    const purchases: NonNullable<Awaited<ReturnType<typeof getPurchaseAsAdmin>>>[] = [];
    for (const purchaseId of purchaseIds) {
      const purchase = await getPurchaseAsAdmin(purchaseId);
      if (!purchase) {
        return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
      }
      const expired =
        purchase.status === 'expired' ||
        (purchase.actual_expiry_date && new Date(purchase.actual_expiry_date) < new Date());
      if (expired) {
        if (purchase.status === 'active') {
          await updatePurchase(purchase.id, { status: 'expired' });
        }
        return NextResponse.json(
          { error: 'This pass has expired. Please purchase a new pass.' },
          { status: 400 }
        );
      }
      purchases.push(purchase);
    }

    // Every purchase_id and child_id must actually belong to customer_id.
    // The gate above says the caller may act on this account; it says nothing
    // about whether the ids in this body hang together, and a mistyped or stale
    // customer_id would otherwise draw down another family's card. Also read
    // with the admin client, and for the same reason as above: see
    // `getCustomerChildIdsAsAdmin`.
    const customerChildIds = await getCustomerChildIdsAsAdmin(customer_id);
    const ownershipError = checkBatchOwnership(customer_id, entries, purchases, customerChildIds);
    if (ownershipError) {
      return NextResponse.json({ error: ownershipError }, { status: 403 });
    }

    // What makes a retry safe. The POS runs on wifi: this batch can commit
    // and the response never arrive, and staff will press Confirm again. A
    // child who is already inside cannot be checked in again, so the second
    // press is rejected rather than spending a second punch each. Read fresh,
    // here, in this request -- see `checkNoOpenSessions`.
    const openSessionChildIds = await getOpenSessionChildIdsAsAdmin(
      entries.map((entry) => entry.child_id)
    );
    const openSessionError = checkNoOpenSessions(entries, openSessionChildIds);
    if (openSessionError) {
      return NextResponse.json({ error: openSessionError }, { status: 409 });
    }

    // A safety net: the POS picker is the intended gatekeeper against
    // over-drawing a card, but the server must not take a correct client on
    // trust when a single call can check in several children against it at
    // once.
    const capacityError = checkBatchCapacity(entries, purchases);
    if (capacityError) {
      return NextResponse.json({ error: capacityError }, { status: 400 });
    }

    const sessions = await createSessions(
      entries.map((entry) => ({
        customer_id,
        purchase_id: entry.purchase_id,
        child_id: entry.child_id,
        start_time: start_time ?? new Date().toISOString(),
        auto_checkout_time,
      }))
    );

    return NextResponse.json({ sessions }, { status: 201 });
  } catch (error) {
    console.error('Error creating sessions:', error);
    return NextResponse.json(
      {
        error: 'Failed to check in',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
