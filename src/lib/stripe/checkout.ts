/**
 * Stripe Checkout Utilities
 * Create checkout sessions for passes, parties, and products
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export interface CheckoutSessionParams {
  customerId: string;
  customerEmail: string;
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
    const session = await stripe.checkout.sessions.create({
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
      customer_email: params.customerEmail,
      metadata: {
        ...params.metadata,
        customer_id: params.customerId,
      },
      allow_promotion_codes: true,
    });

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
  return await stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(email: string, name: string, phone?: string): Promise<Stripe.Customer> {
  return await stripe.customers.create({
    email,
    name,
    phone,
  });
}

