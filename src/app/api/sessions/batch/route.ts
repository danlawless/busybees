/**
 * API Route: Batch check-in
 * POST - Open one session per child against the passes that cover them.
 *
 * A family on one punch card checks in as a unit: either every child gets in
 * or none does, so a partial failure never spends punches for children left
 * outside.
 *
 * Note: POS staff access is controlled via PIN at the application level.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessions } from '@/lib/services/sessions';
import { getPurchase, updatePurchase } from '@/lib/services/purchases';

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

    // Every pass is checked before anything is inserted, so an expired card
    // cannot let part of a family through.
    const purchaseIds = [...new Set(entries.map((e) => e.purchase_id))];
    for (const purchaseId of purchaseIds) {
      const purchase = await getPurchase(purchaseId);
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
