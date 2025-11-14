/**
 * Party Packages Service Layer
 * CRUD operations for party packages
 */

import { createClient } from '../supabase/server';
import { Database } from '../supabase/database.types';

type PartyPackage = Database['public']['Tables']['party_packages']['Row'];
type PartyPackageInsert = Database['public']['Tables']['party_packages']['Insert'];
type PartyPackageUpdate = Database['public']['Tables']['party_packages']['Update'];

/**
 * Get party package by ID
 */
export async function getPartyPackage(id: string): Promise<PartyPackage | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_packages')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching party package:', error);
    throw error;
  }

  return data;
}

/**
 * Get all active party packages
 */
export async function getActivePartyPackages(): Promise<PartyPackage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_packages')
    .select('*')
    .eq('is_active', true)
    .order('base_price', { ascending: true });

  if (error) {
    console.error('Error fetching active party packages:', error);
    throw error;
  }

  return data;
}

/**
 * Get all party packages (staff only)
 */
export async function getAllPartyPackages(): Promise<PartyPackage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_packages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all party packages:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new party package
 */
export async function createPartyPackage(partyPackage: PartyPackageInsert): Promise<PartyPackage> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_packages')
    .insert(partyPackage)
    .select()
    .single();

  if (error) {
    console.error('Error creating party package:', error);
    throw error;
  }

  return data;
}

/**
 * Update a party package
 */
export async function updatePartyPackage(id: string, updates: PartyPackageUpdate): Promise<PartyPackage> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_packages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating party package:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a party package
 */
export async function deletePartyPackage(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('party_packages')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting party package:', error);
    throw error;
  }
}


