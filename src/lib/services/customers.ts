/**
 * Customer Service Layer
 * CRUD operations for customers/users
 */

import { createClient, createAdminClient } from '../supabase/server';
import { Database } from '../supabase/database.types';
import { logger } from '@/lib/logger';

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
    logger.error({ error, customerId: id }, 'Error fetching customer');
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
    logger.error({ error, phone }, 'Error fetching customer by phone');
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
    logger.error({ error }, 'Error fetching customers');
    throw error;
  }

  return data;
}

/**
 * Create a new customer
 */
export async function createCustomer(customer: UserInsert): Promise<User> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('users')
    .insert(customer)
    .select()
    .single();

  if (error) {
    logger.error({ error }, 'Error creating customer');
    throw error;
  }

  return data;
}

/**
 * Update a customer
 */
export async function updateCustomer(id: string, updates: UserUpdate): Promise<User> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error({ error, customerId: id }, 'Error updating customer');
    throw error;
  }

  return data;
}

/**
 * Delete a customer and all related data
 * This performs a cascading delete of:
 * - children
 * - purchases
 * - sessions
 * - saved_cards
 * - party_bookings (sets customer_id to null)
 * - Stripe customer (if exists)
 */
export async function deleteCustomer(id: string): Promise<void> {
  const supabase = createAdminClient();

  logger.info({ customerId: id }, 'Starting customer deletion');

  // First, get the customer to check for Stripe customer ID
  const { data: customer, error: fetchError } = await supabase
    .from('users')
    .select('stripe_customer_id, name, email')
    .eq('id', id)
    .single();

  if (fetchError) {
    logger.error({ error: fetchError, customerId: id }, 'Error fetching customer for deletion');
    throw fetchError;
  }

  // Delete related data in order (respecting foreign key constraints)

  // 1. Delete sessions (references purchases and customer)
  const { error: sessionsError } = await supabase
    .from('sessions')
    .delete()
    .eq('customer_id', id);

  if (sessionsError) {
    logger.error({ error: sessionsError, customerId: id }, 'Error deleting customer sessions');
    throw sessionsError;
  }
  logger.info({ customerId: id }, 'Deleted customer sessions');

  // 2. Delete purchases
  const { error: purchasesError } = await supabase
    .from('purchases')
    .delete()
    .eq('customer_id', id);

  if (purchasesError) {
    logger.error({ error: purchasesError, customerId: id }, 'Error deleting customer purchases');
    throw purchasesError;
  }
  logger.info({ customerId: id }, 'Deleted customer purchases');

  // 3. Delete children
  const { error: childrenError } = await supabase
    .from('children')
    .delete()
    .eq('customer_id', id);

  if (childrenError) {
    logger.error({ error: childrenError, customerId: id }, 'Error deleting customer children');
    throw childrenError;
  }
  logger.info({ customerId: id }, 'Deleted customer children');

  // 4. Delete saved cards
  const { error: cardsError } = await supabase
    .from('saved_cards')
    .delete()
    .eq('customer_id', id);

  if (cardsError) {
    logger.error({ error: cardsError, customerId: id }, 'Error deleting customer saved cards');
    throw cardsError;
  }
  logger.info({ customerId: id }, 'Deleted customer saved cards');

  // 5. Unlink party bookings (set customer_id to null instead of deleting)
  const { error: partyError } = await supabase
    .from('party_bookings')
    .update({ customer_id: null })
    .eq('customer_id', id);

  if (partyError) {
    logger.error({ error: partyError, customerId: id }, 'Error unlinking customer party bookings');
    throw partyError;
  }
  logger.info({ customerId: id }, 'Unlinked customer party bookings');

  // 6. Delete Stripe customer if exists
  if (customer?.stripe_customer_id) {
    try {
      const { getStripeClient } = await import('@/lib/stripe/client');
      const stripe = await getStripeClient();
      await stripe.customers.del(customer.stripe_customer_id);
      logger.info({ customerId: id, stripeCustomerId: customer.stripe_customer_id }, 'Deleted Stripe customer');
    } catch (stripeError) {
      // Log but don't fail the deletion if Stripe cleanup fails
      logger.warn({ error: stripeError, customerId: id, stripeCustomerId: customer.stripe_customer_id }, 'Failed to delete Stripe customer - continuing with database deletion');
    }
  }

  // 7. Finally, delete the user record
  const { error: userError } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (userError) {
    logger.error({ error: userError, customerId: id }, 'Error deleting customer user record');
    throw userError;
  }

  logger.info({ customerId: id, customerName: customer?.name, customerEmail: customer?.email }, 'Successfully deleted customer and all related data');
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
    logger.error({ error, customerId: id }, 'Error fetching customer details');
    throw error;
  }

  return data;
}

