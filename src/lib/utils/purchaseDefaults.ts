/**
 * Purchase Defaults Utility
 * Resolves correct totalSessions and expiryDate from the passes table.
 * Prevents the punch card bug where multi-visit passes got hardcoded to 1 session.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface PurchaseDefaults {
  totalSessions: number;
  expiryDate: Date | null;
}

/**
 * Resolves purchase defaults (totalSessions, expiryDate) from the passes table.
 *
 * For pass types (day_pass, weekly_pass, monthly_pass): REQUIRES a successful
 * lookup from the passes table. Throws if the pass is not found.
 *
 * For non-pass types (party_package, food_beverage): uses known defaults.
 */
export async function resolvePurchaseDefaults(
  productId: string,
  purchaseType: string,
  supabase?: ReturnType<typeof createAdminClient>,
): Promise<PurchaseDefaults> {
  const now = new Date();

  // Non-pass types use known defaults
  if (purchaseType === 'party_package') {
    return {
      totalSessions: 1,
      expiryDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days to book
    };
  }

  if (purchaseType === 'food_beverage') {
    return {
      totalSessions: 1,
      expiryDate: null,
    };
  }

  // Pass types MUST look up from the passes table
  if (['day_pass', 'weekly_pass', 'monthly_pass'].includes(purchaseType)) {
    const db = supabase ?? createAdminClient();

    const { data: passData, error } = await db
      .from('passes')
      .select('sessions_included, duration, category')
      .eq('id', productId)
      .single();

    if (error || !passData) {
      logger.error(
        { productId, purchaseType, error },
        'Pass not found in database - refusing to create purchase with wrong defaults',
      );
      throw new Error(
        `Pass not found for product_id=${productId}. Cannot determine session count and expiry.`,
      );
    }

    const totalSessions = passData.sessions_included;
    const durationDays = passData.duration || 365;

    // Calculate expiry: use the pass's configured duration from purchase date
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    return { totalSessions, expiryDate };
  }

  // Unknown purchase type - safe default
  return {
    totalSessions: 1,
    expiryDate: null,
  };
}
