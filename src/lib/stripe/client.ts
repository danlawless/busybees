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

/**
 * Get Stripe API keys from database settings
 */
async function getStripeKeys() {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['stripe_secret_key', 'stripe_publishable_key'])
    .limit(2);
  
  if (error) {
    console.error('Error fetching Stripe keys from database:', error);
    // Fallback to environment variables
    return {
      secretKey: process.env.STRIPE_SECRET_KEY || null,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
    };
  }
  
  const settings = data?.reduce((acc: any, item: any) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
  
  return {
    secretKey: settings?.stripe_secret_key || process.env.STRIPE_SECRET_KEY || null,
    publishableKey: settings?.stripe_publishable_key || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
  };
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

// For backward compatibility - export a function that gets the client
export const stripe = {
  get: getStripeClient,
};

