/**
 * Children Service Layer
 * CRUD operations for customer children
 */

import { createClient } from '../supabase/server';
import { Database } from '../supabase/database.types';

type Child = Database['public']['Tables']['children']['Row'];
type ChildInsert = Database['public']['Tables']['children']['Insert'];
type ChildUpdate = Database['public']['Tables']['children']['Update'];

/**
 * Get child by ID
 */
export async function getChild(id: string): Promise<Child | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching child:', error);
    throw error;
  }

  return data;
}

/**
 * Get all children for a customer
 */
export async function getCustomerChildren(customerId: string): Promise<Child[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customer children:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new child
 */
export async function createChild(child: ChildInsert): Promise<Child> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('children')
    .insert(child)
    .select()
    .single();

  if (error) {
    console.error('Error creating child:', error);
    throw error;
  }

  return data;
}

/**
 * Update a child
 */
export async function updateChild(id: string, updates: ChildUpdate): Promise<Child> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('children')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating child:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a child
 */
export async function deleteChild(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting child:', error);
    throw error;
  }
}

/**
 * Sign waiver for a child
 */
export async function signWaiver(id: string): Promise<Child> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('children')
    .update({
      waiver_signed: true,
      waiver_signed_date: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error signing waiver:', error);
    throw error;
  }

  return data;
}


