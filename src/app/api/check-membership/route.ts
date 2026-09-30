/**
 * Check Membership Status API
 * Returns whether the authenticated user has an active monthly pass
 * Used by the party booking flow to show automatic member discount
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  MEMBERSHIP_DISCOUNT_PERCENT,
  fromPurchaseRow,
  hasActiveMembership,
} from '@/lib/membership';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isMember: false, discountPercent: 0 });
    }

    // Use admin client to bypass RLS and check purchases
    const adminSupabase = createAdminClient();
    const { data: activePurchases, error } = await adminSupabase
      .from('purchases')
      .select('id, type, status, expiry_date, actual_expiry_date')
      .eq('customer_id', user.id)
      .eq('type', 'monthly_pass')
      .eq('status', 'active');

    if (error) {
      logger.error({ error, userId: user.id }, 'Failed to query active monthly passes');
      return NextResponse.json({ isMember: false, discountPercent: 0 });
    }

    // Status alone isn't sufficient — records exist that are still flagged
    // active while carrying a past expiry date, and a lapsed pass must not
    // earn a discount.
    const isMember = hasActiveMembership((activePurchases ?? []).map(fromPurchaseRow));

    return NextResponse.json({
      isMember,
      discountPercent: isMember ? MEMBERSHIP_DISCOUNT_PERCENT : 0,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to check membership status');
    return NextResponse.json({ isMember: false, discountPercent: 0 });
  }
}
