/**
 * Passes Service Layer
 * CRUD operations for pass products
 */

import { createClient } from '../supabase/server';
import { Database } from '../supabase/database.types';

type Pass = Database['public']['Tables']['passes']['Row'];
type PassInsert = Database['public']['Tables']['passes']['Insert'];
type PassUpdate = Database['public']['Tables']['passes']['Update'];

/**
 * Get pass by ID
 */
export async function getPass(id: string): Promise<Pass | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('passes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching pass:', error);
    throw error;
  }

  return data;
}

/**
 * Get all active passes
 */
export async function getActivePasses(): Promise<Pass[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('passes')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching active passes:', error);
    throw error;
  }

  return data;
}

/**
 * Get all passes (staff only)
 */
export async function getAllPasses(): Promise<Pass[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('passes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all passes:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new pass
 */
export async function createPass(pass: PassInsert): Promise<Pass> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('passes')
    .insert(pass)
    .select()
    .single();

  if (error) {
    console.error('Error creating pass:', error);
    throw error;
  }

  return data;
}

/**
 * Update a pass
 */
export async function updatePass(id: string, updates: PassUpdate): Promise<Pass> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('passes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating pass:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a pass
 */
export async function deletePass(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('passes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting pass:', error);
    throw error;
  }
}

