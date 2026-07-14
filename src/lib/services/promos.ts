/**
 * Promos Service Layer
 * CRUD operations for promotional campaigns
 */

import { createClient } from '../supabase/server';
import { Database } from '../supabase/database.types';
import { formatDateToYYYYMMDD } from '../utils';

type Promo = Database['public']['Tables']['promos']['Row'];
type PromoInsert = Database['public']['Tables']['promos']['Insert'];
type PromoUpdate = Database['public']['Tables']['promos']['Update'];

/**
 * Get promo by ID
 */
export async function getPromo(id: string): Promise<Promo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('promos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching promo:', error);
    throw error;
  }

  return data;
}

/**
 * Get currently active promos
 */
export async function getActivePromos(): Promise<Promo[]> {
  const supabase = await createClient();
  const today = formatDateToYYYYMMDD(new Date());

  const { data, error } = await supabase
    .from('promos')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('discount_percent', { ascending: false });

  if (error) {
    console.error('Error fetching active promos:', error);
    throw error;
  }

  return data;
}

/**
 * Party-only promo codes are defined here in code — NOT in the promos table —
 * so they are redeemable for birthday party bookings only, and never advertised
 * on the homepage promo banner or the passes pricing page (those read the promos
 * table). Redemption is further restricted to party_package purchases server-side.
 */
const PARTY_PROMO_CODES: Record<string, { discountPercent: number; name: string }> = {
  BIRTHDAY26: { discountPercent: 10, name: 'Birthday Early-Bird' },
};

export interface PartyPromo {
  code: string; // canonical (uppercased) code, also used as the Stripe coupon id
  discountPercent: number;
  name: string;
  stripeCouponId: string;
  promoId: string | null; // promos-table id, if the promo came from the DB (else null)
}

/**
 * Validate a customer-typed party promo code (case-insensitive). Party promos
 * are code-defined so they never appear in general marketing surfaces.
 * Returns null if the code isn't a recognized active party promo.
 */
export async function getActivePartyPromoByCode(code: string): Promise<PartyPromo | null> {
  const upper = (code || '').trim().toUpperCase();
  if (!upper) return null;

  const hardcoded = PARTY_PROMO_CODES[upper];
  if (!hardcoded) return null;

  return {
    code: upper,
    discountPercent: hardcoded.discountPercent,
    name: hardcoded.name,
    stripeCouponId: upper,
    promoId: null,
  };
}

/**
 * Get all promos (staff only)
 */
export async function getAllPromos(): Promise<Promo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('promos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all promos:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new promo
 */
export async function createPromo(promo: PromoInsert): Promise<Promo> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('promos')
    .insert(promo)
    .select()
    .single();

  if (error) {
    console.error('Error creating promo:', error);
    throw error;
  }

  return data;
}

/**
 * Update a promo
 */
export async function updatePromo(id: string, updates: PromoUpdate): Promise<Promo> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('promos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating promo:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a promo
 */
export async function deletePromo(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('promos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting promo:', error);
    throw error;
  }
}

