/**
 * Newsletter Service
 * Handles newsletter subscription operations and admin functions
 */

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { Database } from '@/lib/supabase/database.types';

// Database types
type NewsletterSubscriber = Database['public']['Tables']['newsletter_subscribers']['Row'];
type NewsletterSubscriberInsert = Database['public']['Tables']['newsletter_subscribers']['Insert'];

// Valid sources for newsletter subscriptions
export type NewsletterSource = 'website' | 'signup' | 'login' | 'party_booking' | 'pre_register';

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

interface SubscribeOptions {
  email: string;
  name?: string;
  source: NewsletterSource;
}

interface SubscribeResult {
  success: boolean;
  isNew: boolean;
  message: string;
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
 * Subscribe an email to the newsletter
 * Uses upsert to handle existing subscribers gracefully
 */
export async function subscribeToNewsletter(options: SubscribeOptions): Promise<SubscribeResult> {
  const { email, name, source } = options;
  const normalizedEmail = email.toLowerCase().trim();

  const supabase = createAdminClient();

  try {
    // Check if subscriber already exists
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, is_active')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      // Subscriber exists
      if (existing.is_active) {
        logger.info({ email: normalizedEmail, source }, 'Email already subscribed to newsletter');
        return {
          success: true,
          isNew: false,
          message: 'Already subscribed to newsletter',
        };
      }

      // Reactivate subscription
      const { error: updateError } = await supabase
        .from('newsletter_subscribers')
        .update({
          is_active: true,
          name: name || undefined,
          unsubscribed_at: null,
        })
        .eq('id', existing.id);

      if (updateError) {
        logger.error({ error: updateError, email: normalizedEmail }, 'Failed to reactivate newsletter subscription');
        return {
          success: false,
          isNew: false,
          message: 'Failed to reactivate subscription',
        };
      }

      logger.info({ email: normalizedEmail, source }, 'Reactivated newsletter subscription');
      return {
        success: true,
        isNew: false,
        message: 'Subscription reactivated',
      };
    }

    // Create new subscription
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: normalizedEmail,
        name: name || null,
        source,
        is_active: true,
      });

    if (insertError) {
      // Handle unique constraint violation (race condition)
      if (insertError.code === '23505') {
        logger.info({ email: normalizedEmail, source }, 'Email already subscribed (race condition)');
        return {
          success: true,
          isNew: false,
          message: 'Already subscribed to newsletter',
        };
      }

      logger.error({ error: insertError, email: normalizedEmail }, 'Failed to create newsletter subscription');
      return {
        success: false,
        isNew: false,
        message: 'Failed to subscribe',
      };
    }

    logger.info({ email: normalizedEmail, source, name }, 'New newsletter subscription created');
    return {
      success: true,
      isNew: true,
      message: 'Successfully subscribed to newsletter',
    };
  } catch (error) {
    logger.error({ error, email: normalizedEmail }, 'Newsletter subscription error');
    return {
      success: false,
      isNew: false,
      message: 'An error occurred while subscribing',
    };
  }
}

/**
 * Unsubscribe an email from the newsletter
 */
export async function unsubscribeFromNewsletter(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('email', normalizedEmail);

    if (error) {
      logger.error({ error, email: normalizedEmail }, 'Failed to unsubscribe from newsletter');
      return false;
    }

    logger.info({ email: normalizedEmail }, 'Unsubscribed from newsletter');
    return true;
  } catch (error) {
    logger.error({ error, email: normalizedEmail }, 'Newsletter unsubscribe error');
    return false;
  }
}

/**
 * Check if an email is subscribed to the newsletter
 */
export async function isSubscribed(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = createAdminClient();

  try {
    const { data } = await supabase
      .from('newsletter_subscribers')
      .select('is_active')
      .eq('email', normalizedEmail)
      .single();

    return data?.is_active ?? false;
  } catch {
    return false;
  }
}

// ============================================
// Admin CRUD functions for newsletter management
// ============================================

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
