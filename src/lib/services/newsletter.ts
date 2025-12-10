/**
 * Newsletter Service
 * Handles newsletter subscription operations
 */

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// Valid sources for newsletter subscriptions
export type NewsletterSource = 'website' | 'signup' | 'login' | 'party_booking' | 'pre_register';

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
