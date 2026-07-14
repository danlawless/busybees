/**
 * Promos Service Layer
 * CRUD operations for promotional campaigns
 */

import { createClient, createAdminClient } from '../supabase/server';
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
 * Look up an active, customer-facing (non staff-only) promo by the code a
 * customer types (case-insensitive exact match on stripe_coupon_code), enforcing
 * is_active and the start/end date window. Used to validate party promo codes.
 * Uses the admin client so it works for guest (non-logged-in) bookings too.
 * Returns null if no valid promo matches.
 */
export async function getActivePartyPromoByCode(code: string): Promise<Promo | null> {
  const trimmed = (code || '').trim();
  if (!trimmed) return null;

  const supabase = createAdminClient();
  const today = formatDateToYYYYMMDD(new Date());

  const { data, error } = await supabase
    .from('promos')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .ilike('stripe_coupon_code', trimmed)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error validating party promo code:', error);
    return null;
  }

  // Exclude staff-only promos when that column is present. It isn't deployed in
  // every environment; a missing column means the staff-only distinction doesn't
  // exist there, so the promo is treated as customer-facing.
  if (data && (data as { is_staff_only?: boolean }).is_staff_only === true) return null;

  return data;
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

