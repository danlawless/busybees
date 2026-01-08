/**
 * Sibling Discounts Service Layer
 * CRUD operations for sibling/multi-child discount configuration
 */

import { createClient } from '../supabase/server';
import { Database } from '../supabase/database.types';
import { logger } from '../logger';

type SiblingDiscount = Database['public']['Tables']['sibling_discounts']['Row'];
type SiblingDiscountInsert = Database['public']['Tables']['sibling_discounts']['Insert'];
type SiblingDiscountUpdate = Database['public']['Tables']['sibling_discounts']['Update'];

/**
 * Get all sibling discounts, ordered by child position
 */
export async function getAllSiblingDiscounts(): Promise<SiblingDiscount[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sibling_discounts')
    .select('*')
    .order('child_position', { ascending: true });

  if (error) {
    logger.error({ error }, 'Error fetching sibling discounts');
    throw error;
  }

  return data;
}

/**
 * Get active sibling discounts only
 */
export async function getActiveSiblingDiscounts(): Promise<SiblingDiscount[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sibling_discounts')
    .select('*')
    .eq('is_active', true)
    .order('child_position', { ascending: true });

  if (error) {
    logger.error({ error }, 'Error fetching active sibling discounts');
    throw error;
  }

  return data;
}

/**
 * Get sibling discount by child position
 */
export async function getSiblingDiscountByPosition(childPosition: number): Promise<SiblingDiscount | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sibling_discounts')
    .select('*')
    .eq('child_position', childPosition)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    logger.error({ error, childPosition }, 'Error fetching sibling discount by position');
    throw error;
  }

  return data;
}

/**
 * Create or update a sibling discount (upsert)
 */
export async function upsertSiblingDiscount(discount: SiblingDiscountInsert): Promise<SiblingDiscount> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sibling_discounts')
    .upsert(discount, { onConflict: 'child_position' })
    .select()
    .single();

  if (error) {
    logger.error({ error, discount }, 'Error upserting sibling discount');
    throw error;
  }

  logger.info({ discount: data }, 'Sibling discount upserted successfully');
  return data;
}

/**
 * Update a sibling discount by ID
 */
export async function updateSiblingDiscount(id: string, updates: SiblingDiscountUpdate): Promise<SiblingDiscount> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sibling_discounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error({ error, id, updates }, 'Error updating sibling discount');
    throw error;
  }

  logger.info({ discount: data }, 'Sibling discount updated successfully');
  return data;
}

/**
 * Delete a sibling discount by ID
 */
export async function deleteSiblingDiscount(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('sibling_discounts')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error({ error, id }, 'Error deleting sibling discount');
    throw error;
  }

  logger.info({ id }, 'Sibling discount deleted successfully');
}

/**
 * Calculate discounted price for a given quantity and base price
 * Only applies to monthly memberships when applies_to_monthly_only is true
 *
 * @param basePrice - Price per unit
 * @param quantity - Number of items (children)
 * @param discounts - Array of sibling discounts to apply
 * @param isMonthlyMembership - Whether this is a monthly membership purchase
 * @returns Object with total price, breakdown, and savings
 */
export function calculateSiblingDiscount(
  basePrice: number,
  quantity: number,
  discounts: SiblingDiscount[],
  isMonthlyMembership: boolean
): { total: number; breakdown: string; savings: number; discountDetails: Array<{ position: number; discount: number; price: number }> } {
  if (quantity <= 0) {
    return { total: 0, breakdown: '$0.00', savings: 0, discountDetails: [] };
  }

  if (quantity === 1) {
    return {
      total: basePrice,
      breakdown: `$${basePrice.toFixed(2)}`,
      savings: 0,
      discountDetails: [{ position: 1, discount: 0, price: basePrice }],
    };
  }

  // Build discount map for quick lookup
  const discountMap = new Map<number, number>();
  for (const d of discounts) {
    // Only apply if active and either it's a monthly membership or it's not restricted to monthly only
    if (d.is_active && (isMonthlyMembership || !d.applies_to_monthly_only)) {
      discountMap.set(d.child_position, d.discount_percent);
    }
  }

  let total = 0;
  const details: Array<{ position: number; discount: number; price: number }> = [];

  for (let position = 1; position <= quantity; position++) {
    const discountPercent = discountMap.get(position) || 0;
    const price = basePrice * (1 - discountPercent / 100);
    total += price;
    details.push({ position, discount: discountPercent, price });
  }

  const regularTotal = basePrice * quantity;
  const savings = regularTotal - total;

  // Build breakdown string
  const breakdownParts = details.map((d, idx) => {
    if (d.discount > 0) {
      return `$${d.price.toFixed(2)} (${d.discount}% off)`;
    }
    return `$${d.price.toFixed(2)}`;
  });

  return {
    total,
    breakdown: breakdownParts.join(' + '),
    savings,
    discountDetails: details,
  };
}
