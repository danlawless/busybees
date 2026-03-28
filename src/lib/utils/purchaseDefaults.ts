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
 * Check if a child already has an active monthly pass.
 * Prevents purchasing duplicate monthly passes for the same child.
 * Returns an error message if a duplicate is found, or null if OK.
 */
export async function checkDuplicateMonthlyPass(
  childId: string,
  purchaseType: string,
  supabase?: ReturnType<typeof createAdminClient>,
): Promise<string | null> {
  if (purchaseType !== 'monthly_pass' || !childId) return null;

  const db = supabase ?? createAdminClient();

  // Check for direct child_id assignment (single-child passes)
  const { data: existingPasses, error } = await db
    .from('purchases')
    .select('id, name')
    .eq('child_id', childId)
    .eq('type', 'monthly_pass')
    .eq('status', 'active')
    .limit(1);

  if (error) {
    logger.error({ childId, error }, 'Failed to check for existing monthly passes');
    return null;
  }

  if (existingPasses && existingPasses.length > 0) {
    return `This child already has an active monthly pass (${existingPasses[0].name}). Only one monthly pass per child is allowed.`;
  }

  // Also check for family passes via purchase_children table
  const { data: familyLinks, error: familyError } = await db
    .from('purchase_children')
    .select('purchase_id, purchases!inner(id, name, type, status)')
    .eq('child_id', childId)
    .eq('purchases.type', 'monthly_pass')
    .eq('purchases.status', 'active')
    .limit(1);

  if (familyError) {
    logger.error({ childId, error: familyError }, 'Failed to check family pass links');
    return null;
  }

  if (familyLinks && familyLinks.length > 0) {
    const linkedPurchase = (familyLinks[0] as any).purchases;
    return `This child is already covered by an active family pass (${linkedPurchase.name}). Only one monthly pass per child is allowed.`;
  }

  return null;
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
    let expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Event passes with fixed end dates: look up pass name for override
    const { data: passNameData } = await db
      .from('passes')
      .select('name')
      .eq('id', productId)
      .single();

    if (passNameData?.name?.toLowerCase().includes('easter egg')) {
      // Easter Egg Hunt passes expire April 4, 2026 at 3:00 PM EST (7:00 PM UTC)
      expiryDate = new Date('2026-04-04T19:00:00.000Z');
    }

    return { totalSessions, expiryDate };
  }

  // Unknown purchase type - safe default
  return {
    totalSessions: 1,
    expiryDate: null,
  };
}
