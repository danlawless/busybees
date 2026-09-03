/**
 * API Route: Sessions
 * GET - List active sessions (all or for specific customer)
 * POST - Create a new session (check-in)
 *
 * POST requires a staff/admin session. Before migration 052 an insert here
 * spent nothing -- the punch came off at check-out. It now deducts a punch the
 * instant the row lands, which puts this route in the same class as its batch
 * sibling and as `/api/purchases/pos`. The POS PIN is a client-side screen
 * lock and proves nothing to the server.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllActiveSessions, getActiveSessions, createSession } from '@/lib/services/sessions';
import { getPurchaseAsAdmin, updatePurchase } from '@/lib/services/purchases';
import { getCustomerChildIdsAsAdmin } from '@/lib/services/children';
import { requireStaff } from './requireStaff';
import { OWNERSHIP_MISMATCH_MESSAGE } from './batch/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    // Return sessions for specific customer or all active sessions
    const sessions = customerId
      ? await getActiveSessions(customerId)
      : await getAllActiveSessions();

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * One child, one pass. `child_id` is optional because a pass bought for a
 * named child already carries that child on the purchase; an account-scoped
 * punch card needs it, and the batch endpoint is what the POS uses for those.
 */
const sessionSchema = z.object({
  customer_id: z.string().uuid(),
  purchase_id: z.string().uuid(),
  child_id: z.string().uuid().nullish(),
  start_time: z.string().datetime().optional(),
  auto_checkout_time: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  try {
    const denied = await requireStaff();
    if (denied) return denied;

    const parsed = sessionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid check-in request', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { customer_id, purchase_id, child_id, start_time, auto_checkout_time } = parsed.data;

    // Read as admin for the same reason the batch route does: under RLS an
    // invisible row and a missing row are indistinguishable, and everything
    // below denies on absence. See `getPurchaseAsAdmin`.
    const purchase = await getPurchaseAsAdmin(purchase_id);
    if (!purchase) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    // Expiry is now checked unconditionally. It used to sit inside
    // `if (purchase && ...)`, so a purchase this route could not read simply
    // skipped the check and created the session anyway -- and since 052 that
    // insert spends a punch off a card that should not have been usable.
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

    // The pass, and the child spending it, must belong to the customer named
    // in the body -- otherwise an arbitrary child_id would draw a punch off
    // whichever card the caller pointed at. One generic message either way, so
    // this cannot be used to probe for ids on other accounts.
    if (purchase.customer_id !== customer_id) {
      return NextResponse.json({ error: OWNERSHIP_MISMATCH_MESSAGE }, { status: 403 });
    }
    if (child_id) {
      const customerChildIds = await getCustomerChildIdsAsAdmin(customer_id);
      if (!customerChildIds.includes(child_id)) {
        return NextResponse.json({ error: OWNERSHIP_MISMATCH_MESSAGE }, { status: 403 });
      }
    }

    const session = await createSession({
      customer_id,
      purchase_id,
      child_id: child_id ?? null,
      start_time: start_time ?? new Date().toISOString(),
      auto_checkout_time,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
