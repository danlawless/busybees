/**
 * Stripe Payment Methods Utilities
 * Handle payment method creation, retrieval, and management
 */

import Stripe from 'stripe';
import { getStripeClient } from './client';
import { createAdminClient } from '../supabase/server';

/**
 * Create or retrieve Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name: string,
  phone?: string
): Promise<string> {
  const stripe = await getStripeClient();
  const supabase = createAdminClient();

  // Check if user already has a Stripe customer ID
  const { data: userData } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (userData?.stripe_customer_id) {
    return userData.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    phone,
    metadata: {
      supabase_user_id: userId,
    },
  });

  // Update user record with Stripe customer ID
  await supabase
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

/**
 * Create a SetupIntent for adding a new payment method
 */
export async function createSetupIntent(
  customerId: string
): Promise<Stripe.SetupIntent> {
  const stripe = await getStripeClient();

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  });

  return setupIntent;
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const stripe = await getStripeClient();

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  return paymentMethods.data;
}

/**
 * Get a specific payment method
 */
export async function getPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  const stripe = await getStripeClient();
  return await stripe.paymentMethods.retrieve(paymentMethodId);
}

/**
 * Detach (delete) a payment method
 */
export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  const stripe = await getStripeClient();
  return await stripe.paymentMethods.detach(paymentMethodId);
}

/**
 * Set a payment method as default for a customer
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  const stripe = await getStripeClient();

  const customer = await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  return customer;
}

/**
 * Save payment method to database
 */
export async function savePaymentMethodToDatabase(
  userId: string,
  paymentMethod: Stripe.PaymentMethod,
  isDefault: boolean = false
): Promise<void> {
  const supabase = createAdminClient();

  const card = paymentMethod.card;
  if (!card) {
    throw new Error('Payment method is not a card');
  }

  // If setting as default, unset other defaults first
  if (isDefault) {
    await supabase
      .from('saved_cards')
      .update({ is_default: false })
      .eq('customer_id', userId);
  }

  // Insert new card
  await supabase.from('saved_cards').insert({
    customer_id: userId,
    stripe_payment_method_id: paymentMethod.id,
    last4: card.last4,
    brand: card.brand,
    expiry_month: card.exp_month,
    expiry_year: card.exp_year,
    is_default: isDefault,
  });
}

/**
 * Delete payment method from database
 */
export async function deletePaymentMethodFromDatabase(
  paymentMethodId: string
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('saved_cards')
    .delete()
    .eq('stripe_payment_method_id', paymentMethodId);
}

/**
 * Sync payment methods from Stripe to database
 */
export async function syncPaymentMethodsToDatabase(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  const stripe = await getStripeClient();
  const supabase = createAdminClient();

  // Get payment methods from Stripe
  const paymentMethods = await listPaymentMethods(stripeCustomerId);

  // Get existing saved cards from database
  const { data: existingCards } = await supabase
    .from('saved_cards')
    .select('stripe_payment_method_id')
    .eq('customer_id', userId);

  const existingIds = new Set(
    existingCards?.map((card) => card.stripe_payment_method_id) || []
  );

  // Get customer's default payment method
  const customer = await stripe.customers.retrieve(stripeCustomerId);
  const defaultPaymentMethodId =
    typeof customer !== 'deleted' && customer.invoice_settings
      ? customer.invoice_settings.default_payment_method
      : null;

  // Add new payment methods to database
  for (const pm of paymentMethods) {
    if (!existingIds.has(pm.id)) {
      const isDefault =
        pm.id === defaultPaymentMethodId || paymentMethods.length === 1;
      await savePaymentMethodToDatabase(userId, pm, isDefault);
    }
  }

  // Remove payment methods that no longer exist in Stripe
  const stripeIds = new Set(paymentMethods.map((pm) => pm.id));
  const cardsToDelete = existingCards?.filter(
    (card) => !stripeIds.has(card.stripe_payment_method_id)
  );

  if (cardsToDelete && cardsToDelete.length > 0) {
    await supabase
      .from('saved_cards')
      .delete()
      .in(
        'stripe_payment_method_id',
        cardsToDelete.map((card) => card.stripe_payment_method_id)
      );
  }
}

