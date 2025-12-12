/**
 * Gift Card Checkout API Route
 * Creates Stripe checkout session for gift card purchases
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { getGiftCardDenominations } from '@/lib/services/gift-cards';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const checkoutSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  purchaser_email: z.string().email('Invalid purchaser email'),
  purchaser_name: z.string().min(1, 'Purchaser name is required'),
  recipient_email: z.string().email('Invalid recipient email'),
  recipient_name: z.string().min(1, 'Recipient name is required'),
  personal_message: z.string().max(500).optional(),
  delivery_method: z.enum(['email_recipient', 'email_self']),
});

/**
 * POST /api/gift-cards/checkout
 * Create a Stripe checkout session for gift card purchase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = checkoutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Validate amount against available denominations
    const denominations = await getGiftCardDenominations();
    const validAmount = denominations.some((d) => d.amount === data.amount);

    if (!validAmount) {
      return NextResponse.json(
        { error: 'Invalid gift card amount' },
        { status: 400 }
      );
    }

    const stripe = await getStripeClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Busy Bees Gift Card - $${data.amount}`,
              description: `Gift card for ${data.recipient_name}`,
              images: [`${siteUrl}/busy-bees-logo.png`],
            },
            unit_amount: Math.round(data.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/gift-cards/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/gift-cards/purchase`,
      customer_email: data.purchaser_email,
      metadata: {
        type: 'gift_card',
        amount: data.amount.toString(),
        purchaser_email: data.purchaser_email,
        purchaser_name: data.purchaser_name,
        recipient_email: data.recipient_email,
        recipient_name: data.recipient_name,
        personal_message: data.personal_message || '',
        delivery_method: data.delivery_method,
      },
    });

    logger.info(
      {
        sessionId: session.id,
        amount: data.amount,
        purchaser: data.purchaser_email,
        recipient: data.recipient_email,
      },
      '🛒 Gift card checkout session created'
    );

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create gift card checkout session');
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

