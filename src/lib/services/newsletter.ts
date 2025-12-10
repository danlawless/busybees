/**
 * Newsletter Subscribers Service
 * Handles database operations for newsletter subscribers
 */

import { createClient } from '../supabase/server';
import { Database } from '../supabase/database.types';

type NewsletterSubscriber = Database['public']['Tables']['newsletter_subscribers']['Row'];
type NewsletterSubscriberInsert = Database['public']['Tables']['newsletter_subscribers']['Insert'];
type NewsletterSubscriberUpdate = Database['public']['Tables']['newsletter_subscribers']['Update'];

export interface NewsletterSubscriberData {
  id: string;
  name: string;
  email: string;
  subscribedAt: string;
  isActive: boolean;
  unsubscribedAt: string | null;
  source: string;
  createdAt: string;
}

/**
 * Convert database row to frontend format
 */
function toSubscriberData(row: NewsletterSubscriber): NewsletterSubscriberData {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subscribedAt: row.subscribed_at,
    isActive: row.is_active,
    unsubscribedAt: row.unsubscribed_at,
    source: row.source,
    createdAt: row.created_at,
  };
}

/**
 * Get all newsletter subscribers
 */
export async function getAllSubscribers(): Promise<NewsletterSubscriberData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toSubscriberData);
}

/**
 * Get active newsletter subscribers only
 */
export async function getActiveSubscribers(): Promise<NewsletterSubscriberData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .eq('is_active', true)
    .order('subscribed_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toSubscriberData);
}

/**
 * Get a single subscriber by ID
 */
export async function getSubscriber(id: string): Promise<NewsletterSubscriberData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return toSubscriberData(data);
}

/**
 * Get subscriber by email
 */
export async function getSubscriberByEmail(email: string): Promise<NewsletterSubscriberData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return toSubscriberData(data);
}

/**
 * Create a new newsletter subscriber
 */
export async function createSubscriber(
  name: string,
  email: string,
  source: string = 'website'
): Promise<NewsletterSubscriberData> {
  const supabase = await createClient();

  // Check if subscriber already exists
  const existing = await getSubscriberByEmail(email);
  if (existing) {
    // If they unsubscribed before, reactivate them
    if (!existing.isActive) {
      return reactivateSubscriber(existing.id);
    }
    // Already subscribed and active
    return existing;
  }

  const insertData: NewsletterSubscriberInsert = {
    name,
    email: email.toLowerCase(),
    source,
    is_active: true,
    subscribed_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return toSubscriberData(data);
}

/**
 * Reactivate a subscriber who previously unsubscribed
 */
export async function reactivateSubscriber(id: string): Promise<NewsletterSubscriberData> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .update({
      is_active: true,
      unsubscribed_at: null,
      subscribed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toSubscriberData(data);
}

/**
 * Unsubscribe (soft delete - keeps record but marks inactive)
 */
export async function unsubscribe(id: string): Promise<NewsletterSubscriberData> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toSubscriberData(data);
}

/**
 * Delete subscriber permanently (admin only)
 */
export async function deleteSubscriber(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('newsletter_subscribers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Get subscriber statistics
 */
export async function getSubscriberStats(): Promise<{
  total: number;
  active: number;
  unsubscribed: number;
}> {
  const supabase = await createClient();

  const { count: total, error: totalError } = await supabase
    .from('newsletter_subscribers')
    .select('*', { count: 'exact', head: true });

  if (totalError) throw totalError;

  const { count: active, error: activeError } = await supabase
    .from('newsletter_subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (activeError) throw activeError;

  return {
    total: total || 0,
    active: active || 0,
    unsubscribed: (total || 0) - (active || 0),
  };
}
