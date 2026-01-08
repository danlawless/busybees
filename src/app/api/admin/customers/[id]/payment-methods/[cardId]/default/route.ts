/**
 * API Route: Set Default Payment Method
 * POST - Set a card as the default payment method
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';

async function getStripeClient(): Promise<Stripe | null> {
  try {
    const supabase = createAdminClient();
    const { data: settings } = await supabase
      .from('settings')
      .select('stripe_secret_key')
      .single();

    if (!settings?.stripe_secret_key) {
      return null;
    }

    return new Stripe(settings.stripe_secret_key, {
      apiVersion: '2025-04-30.basil',
    });
  } catch {
    return null;
  }
}

function getStripeCustomerIdColumn(secretKey: string): string {
  return secretKey.startsWith('sk_test_') ? 'stripe_customer_id_test' : 'stripe_customer_id_live';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  try {
    const { id: customerId, cardId } = await params;

    logger.info({ customerId, cardId }, '⭐ Setting default payment method');

    const supabase = createAdminClient();

    // Get the card and customer details
    const { data: card, error: cardError } = await supabase
      .from('saved_cards')
      .select('stripe_payment_method_id')
      .eq('id', cardId)
      .eq('customer_id', customerId)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Unset all other defaults for this customer
    await supabase
      .from('saved_cards')
      .update({ is_default: false })
      .eq('customer_id', customerId);

    // Set this card as default
    const { error: updateError } = await supabase
      .from('saved_cards')
      .update({ is_default: true })
      .eq('id', cardId)
      .eq('customer_id', customerId);

    if (updateError) {
      logger.error({ updateError, customerId, cardId }, 'Failed to set default card');
      return NextResponse.json({ error: 'Failed to set default card' }, { status: 500 });
    }

    // Update Stripe customer default payment method if available
    if (card.stripe_payment_method_id) {
      const stripe = await getStripeClient();
      if (stripe) {
        try {
          // Get settings to determine which column to use
          const { data: settings } = await supabase
            .from('settings')
            .select('stripe_secret_key')
            .single();

          if (settings?.stripe_secret_key) {
            const stripeColumn = getStripeCustomerIdColumn(settings.stripe_secret_key);

            const { data: user } = await supabase
              .from('users')
              .select(stripeColumn)
              .eq('id', customerId)
              .single();

            const stripeCustomerId = user?.[stripeColumn as keyof typeof user] as string | undefined;

            if (stripeCustomerId) {
              await stripe.customers.update(stripeCustomerId, {
                invoice_settings: {
                  default_payment_method: card.stripe_payment_method_id,
                },
              });
              logger.info({ stripeCustomerId }, '✅ Updated Stripe default payment method');
            }
          }
        } catch (stripeError) {
          logger.warn({ stripeError }, 'Failed to update Stripe default (local update succeeded)');
        }
      }
    }

    logger.info({ customerId, cardId }, '✅ Default card set successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to set default payment method');
    return NextResponse.json({ error: 'Failed to set default payment method' }, { status: 500 });
  }
}
