/**
 * Stripe Client Configuration
 * Server-side Stripe client for making API calls
 * Keys are stored in database and retrieved dynamically
 */

import Stripe from 'stripe';
import { createAdminClient } from '../supabase/server';

// Cache the stripe instance to avoid recreating it on every request
let stripeInstance: Stripe | null = null;
let cachedSecretKey: string | null = null;

// Cache Stripe keys to avoid redundant DB queries within the same request cycle
let cachedKeys: { secretKey: string | null; publishableKey: string | null } | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Get Stripe API keys from database settings (cached for 30s)
 */
async function getStripeKeys() {
  if (cachedKeys && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedKeys;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['stripe_secret_key', 'stripe_publishable_key'])
    .limit(2);

  if (error) {
    console.error('Error fetching Stripe keys from database:', error);
    // Fallback to environment variables
    const fallback = {
      secretKey: process.env.STRIPE_SECRET_KEY || null,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
    };
    cachedKeys = fallback;
    cacheTimestamp = Date.now();
    return fallback;
  }

  const settings = data?.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  const result = {
    secretKey: settings?.stripe_secret_key || process.env.STRIPE_SECRET_KEY || null,
    publishableKey: settings?.stripe_publishable_key || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
  };

  cachedKeys = result;
  cacheTimestamp = Date.now();
  return result;
}

/**
 * Get Stripe client instance (lazy initialization)
 */
export async function getStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeKeys();

  if (!secretKey) {
    throw new Error('Stripe secret key not configured. Please add it in Settings.');
  }

  // Return cached instance if key hasn't changed
  if (stripeInstance && cachedSecretKey === secretKey) {
    return stripeInstance;
  }

  // Create new instance
  cachedSecretKey = secretKey;
  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
  });

  return stripeInstance;
}

/**
 * Get Stripe publishable key for client-side use
 */
export async function getPublishableKey(): Promise<string> {
  const { publishableKey } = await getStripeKeys();

  if (!publishableKey) {
    throw new Error('Stripe publishable key not configured. Please add it in Settings.');
  }

  return publishableKey;
}

/**
 * Detect if Stripe is in test or live mode based on the secret key
 * Returns 'test' or 'live'
 */
export async function getStripeMode(): Promise<'test' | 'live'> {
  const { secretKey } = await getStripeKeys();

  if (!secretKey) {
    // Default to test mode if no key configured
    return 'test';
  }

  return secretKey.startsWith('sk_live_') ? 'live' : 'test';
}

/**
 * Get the database column name for the current Stripe mode
 */
export async function getStripeCustomerIdColumn(): Promise<'stripe_customer_id_test' | 'stripe_customer_id_live'> {
  const mode = await getStripeMode();
  return mode === 'live' ? 'stripe_customer_id_live' : 'stripe_customer_id_test';
}

// For backward compatibility - export a function that gets the client
export const stripe = {
  get: getStripeClient,
};

