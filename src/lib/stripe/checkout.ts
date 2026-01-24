/**
 * Stripe Checkout Utilities
 * Create checkout sessions for passes, parties, and products
 */

import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { getStripeClient } from './client';
import { getOrCreateStripeCustomer } from './payment-methods';
import { logger } from '../logger';

export interface CheckoutSessionParams {
  customerId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  stripeCustomerId?: string;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
  lineItems: Array<{
    price: number;
    quantity: number;
    name: string;
    description?: string;
  }>;
  metadata: {
    purchase_type: 'day_pass' | 'weekly_pass' | 'monthly_pass' | 'party_package' | 'food_beverage';
    product_id: string;
    child_id?: string;
    [key: string]: string | undefined;
  };
  successUrl: string;
  cancelUrl: string;
  discounts?: Array<{ coupon: string }>;
}

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(params: CheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const logContext = {
    customerId: params.customerId,
    customerEmail: params.customerEmail,
    purchaseType: params.metadata.purchase_type,
    productId: params.metadata.product_id,
  };

  logger.info(logContext, '🛒 Creating checkout session');

  try {
    const stripe = await getStripeClient();

    // Get or create Stripe customer
    let stripeCustomerId: string;
    try {
      stripeCustomerId = params.stripeCustomerId || await getOrCreateStripeCustomer(
        params.customerId,
        params.customerEmail,
        params.customerName,
        params.customerPhone
      );

      logger.info(
        { ...logContext, stripeCustomerId },
        '✅ Stripe customer ready for checkout'
      );
    } catch (customerError) {
      // Log customer creation failure but rethrow - we can't proceed without a customer
      logger.error(
        { ...logContext, error: customerError },
        '❌ Failed to get or create Stripe customer'
      );

      Sentry.captureException(customerError, {
        tags: {
          operation: 'checkout.customer',
          purchase_type: params.metadata.purchase_type,
        },
        extra: logContext,
      });

      throw new Error('Unable to prepare payment. Please try again or contact support.');
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: params.lineItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.description,
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer: stripeCustomerId,
      metadata: {
        ...params.metadata,
        customer_id: params.customerId,
      },
      // If discounts are pre-applied (staff discount), don't allow additional promo codes
      allow_promotion_codes: !params.discounts?.length,
      ...(params.discounts?.length && { discounts: params.discounts }),
    };

    // If user wants to save payment method for future use
    if (params.savePaymentMethod) {
      sessionConfig.payment_intent_data = {
        setup_future_usage: 'off_session',
      };
    }

    // If using a saved payment method
    if (params.paymentMethodId) {
      sessionConfig.payment_method_types = ['card'];
      // Note: To use a saved payment method, you'd typically create a PaymentIntent directly
      // For checkout sessions, Stripe will show saved payment methods automatically for the customer
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logger.info(
      { ...logContext, sessionId: session.id, stripeCustomerId },
      '✨ Checkout session created successfully'
    );

    Sentry.addBreadcrumb({
      category: 'stripe.checkout',
      message: 'Checkout session created',
      level: 'info',
      data: {
        sessionId: session.id,
        purchaseType: params.metadata.purchase_type,
        customerId: params.customerId,
      },
    });

    return session;
  } catch (error) {
    // Only log if we haven't already logged this error above
    if (!(error instanceof Error && error.message.includes('Unable to prepare payment'))) {
      logger.error({ ...logContext, error }, '❌ Failed to create checkout session');

      Sentry.captureException(error, {
        tags: {
          operation: 'checkout.session',
          purchase_type: params.metadata.purchase_type,
        },
        extra: logContext,
      });
    }

    // Rethrow with user-friendly message if it's a generic error
    if (error instanceof Error && !error.message.includes('Unable to prepare payment')) {
      throw new Error('Failed to create checkout session. Please try again or contact support.');
    }

    throw error;
  }
}

/**
 * Retrieve a checkout session
 */
export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = await getStripeClient();
  return await stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(email: string, name: string, phone?: string): Promise<Stripe.Customer> {
  const stripe = await getStripeClient();
  return await stripe.customers.create({
    email,
    name,
    phone,
  });
}

/**
 * Expire a checkout session
 * Used when replacing a session with a new one (e.g., when applying staff discount)
 */
export async function expireCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = await getStripeClient();

  try {
    const session = await stripe.checkout.sessions.expire(sessionId);
    logger.info({ sessionId }, '🔄 Checkout session expired');
    return session;
  } catch (error) {
    // Session may already be expired, completed, or not exist
    logger.warn({ sessionId, error }, '⚠️ Could not expire checkout session');
    throw error;
  }
}
