/**
 * Customer Service Layer
 * CRUD operations for customers/users
 */

import { createClient } from '../supabase/server';
import { Database } from '../supabase/database.types';

type User = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

/**
 * Get customer by ID
 */
export async function getCustomer(id: string): Promise<User | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching customer:', error);
    throw error;
  }

  return data;
}

/**
 * Get customer by phone number
 */
export async function getCustomerByPhone(phone: string): Promise<User | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found error
    console.error('Error fetching customer by phone:', error);
    throw error;
  }

  return data;
}

/**
 * Get all customers (staff only)
 */
export async function getAllCustomers(): Promise<User[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new customer
 */
export async function createCustomer(customer: UserInsert): Promise<User> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .insert(customer)
    .select()
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    throw error;
  }

  return data;
}

/**
 * Update a customer
 */
export async function updateCustomer(id: string, updates: UserUpdate): Promise<User> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a customer
 */
export async function deleteCustomer(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
}

/**
 * Get customer with children, purchases, and active sessions
 */
export async function getCustomerWithDetails(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      children (*),
      purchases (*),
      sessions!sessions_customer_id_fkey (
        *,
        purchase:purchases (*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching customer details:', error);
    throw error;
  }

  return data;
}

