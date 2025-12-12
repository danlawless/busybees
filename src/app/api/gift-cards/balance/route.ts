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
 * Get the current user's gift card balance
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

    const balance = await getUserGiftCardBalance(user.id);

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

