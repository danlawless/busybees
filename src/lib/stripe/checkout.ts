/**
 * Stripe Checkout Utilities
 * Create checkout sessions for passes, parties, and products
 */

import Stripe from 'stripe';
import { getStripeClient } from './client';
import { getOrCreateStripeCustomer } from './payment-methods';

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
}

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(params: CheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  try {
    const stripe = await getStripeClient();

    // Get or create Stripe customer
    const stripeCustomerId = params.stripeCustomerId || await getOrCreateStripeCustomer(
      params.customerId,
      params.customerEmail,
      params.customerName,
      params.customerPhone
    );

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
      allow_promotion_codes: true,
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

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error('Failed to create checkout session');
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
