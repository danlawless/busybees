/**
 * Stripe Subscription Management Functions
 * Create, update, and cancel subscriptions
 */

import { getStripeClient } from './client';
import Stripe from 'stripe';

export interface CreateSubscriptionData {
  customer: string; // Stripe customer ID
  items: {
    price: string; // Price ID
    quantity?: number;
  }[];
  payment_behavior?: 'default_incomplete' | 'error_if_incomplete' | 'allow_incomplete';
  coupon?: string; // Coupon ID
  trial_period_days?: number;
  metadata?: Record<string, string>;
}

/**
 * Create a subscription in Stripe
 */
export async function createStripeSubscription(
  data: CreateSubscriptionData
): Promise<Stripe.Subscription> {
  const stripe = await getStripeClient();
  return await stripe.subscriptions.create({
    customer: data.customer,
    items: data.items,
    payment_behavior: data.payment_behavior || 'default_incomplete',
    coupon: data.coupon,
    trial_period_days: data.trial_period_days,
    metadata: data.metadata || {},
    expand: ['latest_invoice.payment_intent'],
  });
}

/**
 * Update a subscription in Stripe
 */
export async function updateStripeSubscription(
  subscriptionId: string,
  data: {
    items?: { id?: string; price?: string; quantity?: number }[];
    coupon?: string;
    metadata?: Record<string, string>;
  }
): Promise<Stripe.Subscription> {
  const stripe = await getStripeClient();
  return await stripe.subscriptions.update(subscriptionId, {
    items: data.items,
    coupon: data.coupon,
    metadata: data.metadata,
  });
}

/**
 * Cancel a subscription in Stripe
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  const stripe = await getStripeClient();
  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId);
  } else {
    // Cancel at period end
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

/**
 * Resume a canceled subscription
 */
export async function resumeStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = await getStripeClient();
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Get a subscription from Stripe
 */
export async function getStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = await getStripeClient();
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * List subscriptions for a customer
 */
export async function listStripeSubscriptions(
  customerId?: string
): Promise<Stripe.ApiList<Stripe.Subscription>> {
  const stripe = await getStripeClient();
  return await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
  });
}

/**
 * Create or retrieve a Stripe customer
 */
export async function createOrGetStripeCustomer(
  email: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  const stripe = await getStripeClient();
  // Search for existing customer
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });
  
  if (customers.data.length > 0) {
    return customers.data[0];
  }
  
  // Create new customer
  return await stripe.customers.create({
    email,
    metadata: metadata || {},
  });
}

