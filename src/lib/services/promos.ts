/**
 * Promos Service Layer
 * CRUD operations for promotional campaigns
 */

import { createClient } from '../supabase/server';
import { Database } from '../supabase/database.types';

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
  const today = new Date().toISOString().split('T')[0];

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

