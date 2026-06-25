/**
 * Gift Card Balance API Route
 * Get current user's gift card balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserGiftCardBalance } from '@/lib/services/gift-cards';
import { logger } from '@/lib/logger';

/**
 * GET /api/gift-cards/balance
 * Get the current user's gift card balance.
 * Staff/admin may pass ?customerId=<id> to read another customer's balance
 * (used by the POS to display a looked-up customer's credit).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Resolve whose balance to return. Default to the authenticated user.
    let targetUserId = user.id;
    const requestedCustomerId = request.nextUrl.searchParams.get('customerId');

    if (requestedCustomerId && requestedCustomerId !== user.id) {
      // Only staff/admin may read another customer's balance.
      const { data: requester } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!requester || !['staff', 'admin'].includes(requester.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      targetUserId = requestedCustomerId;
    }

    const balance = await getUserGiftCardBalance(targetUserId);

    return NextResponse.json({
      balance,
      formatted: `$${balance.toFixed(2)}`,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch gift card balance');
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}

