/**
 * API Route: Sessions
 * GET - List active sessions (all or for specific customer)
 * POST - Create a new session (check-in)
 *
 * Note: POS staff access is controlled via PIN at the application level.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllActiveSessions, getActiveSessions, createSession } from '@/lib/services/sessions';
import { getPurchase, updatePurchase } from '@/lib/services/purchases';

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

export async function POST(request: NextRequest) {
  try {
    // Note: POS staff access is controlled via PIN at the application level
    const body = await request.json();

    // Validate pass is not expired before allowing check-in
    if (body.purchase_id) {
      const purchase = await getPurchase(body.purchase_id);
      if (purchase && purchase.actual_expiry_date) {
        const now = new Date();
        const expiryDate = new Date(purchase.actual_expiry_date);
        if (now > expiryDate) {
          // Also persist the expired status to the database
          if (purchase.status === 'active') {
            await updatePurchase(purchase.id, { status: 'expired' });
          }
          return NextResponse.json(
            { error: 'This pass has expired. Please purchase a new pass.' },
            { status: 400 }
          );
        }
      }
      if (purchase && purchase.status === 'expired') {
        return NextResponse.json(
          { error: 'This pass has expired. Please purchase a new pass.' },
          { status: 400 }
        );
      }
    }

    const session = await createSession(body);

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

