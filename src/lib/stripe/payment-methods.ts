/**
 * Stripe Payment Methods Utilities
 * Handle payment method creation, retrieval, and management
 */

import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { getStripeClient, getStripeMode, getStripeCustomerIdColumn } from './client';
import { createAdminClient } from '../supabase/server';
import { logger } from '../logger';

/**
 * Create or retrieve Stripe customer for a user
 * Handles both logged-in users (with database records) and temporary/guest users
 * Automatically uses the correct customer ID column based on test/live mode
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name: string,
  phone?: string
): Promise<string> {
  const stripe = await getStripeClient();
  const stripeMode = await getStripeMode();
  const customerIdColumn = await getStripeCustomerIdColumn();

  // For temporary/guest users (temp_*), skip database lookup and create Stripe customer directly
  const isTempUser = userId.startsWith('temp_');

  logger.info(
    { userId, email, isTempUser, stripeMode, customerIdColumn },
    isTempUser ? '🎫 Creating Stripe customer for guest user' : `🔍 Looking up Stripe customer for registered user (${stripeMode} mode)`
  );

  if (!isTempUser) {
    // Only query database for registered users
    const supabase = createAdminClient();

    const { data: userData, error: queryError } = await supabase
      .from('users')
      .select(`${customerIdColumn}`)
      .eq('id', userId)
      .single();

    if (queryError) {
      // User doesn't exist in public.users table - log but continue
      logger.warn(
        { userId, error: queryError, email, stripeMode },
        '⚠️ User not found in database, creating Stripe customer without database record'
      );

      Sentry.addBreadcrumb({
        category: 'stripe.customer',
        message: 'User not found in database during Stripe customer creation',
        level: 'warning',
        data: { userId, email, stripeMode },
      });
    } else {
      const existingCustomerId = userData?.[customerIdColumn];
      if (existingCustomerId) {
        logger.info({ userId, stripeCustomerId: existingCustomerId, stripeMode }, `✅ Found existing Stripe customer (${stripeMode} mode)`);
        return existingCustomerId;
      }
    }
  }

  // Create new Stripe customer
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata: {
        supabase_user_id: userId,
        is_temp_user: isTempUser.toString(),
        stripe_mode: stripeMode,
      },
    });

    logger.info({ userId, stripeCustomerId: customer.id, isTempUser, stripeMode }, `✨ Created new Stripe customer (${stripeMode} mode)`);

    // Update user record with Stripe customer ID (only for registered users)
    if (!isTempUser) {
      const supabase = createAdminClient();
      const { error: updateError } = await supabase
        .from('users')
        .update({ [customerIdColumn]: customer.id })
        .eq('id', userId);

      if (updateError) {
        // Log the error but don't fail - the Stripe customer was created successfully
        logger.warn(
          { userId, stripeCustomerId: customer.id, error: updateError, stripeMode },
          `⚠️ Failed to update user record with Stripe customer ID (${stripeMode}), but Stripe customer created successfully`
        );

        Sentry.captureException(updateError, {
          level: 'warning',
          tags: { operation: 'stripe.customer.update', stripeMode },
          extra: { userId, stripeCustomerId: customer.id },
        });
      } else {
        logger.info({ userId, stripeCustomerId: customer.id, stripeMode, customerIdColumn }, `💾 Updated user record with Stripe customer ID (${stripeMode} mode)`);
      }
    }

    return customer.id;
  } catch (error) {
    logger.error({ error, userId, email, stripeMode }, `❌ Failed to create Stripe customer (${stripeMode} mode)`);

    Sentry.captureException(error, {
      tags: { operation: 'stripe.customer.create', stripeMode },
      extra: { userId, email, isTempUser },
    });

    throw error;
  }
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

