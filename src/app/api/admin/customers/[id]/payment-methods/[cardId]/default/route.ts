/**
 * API Route: Set Default Payment Method
 * POST - Set a card as the default payment method
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getStripeClient, getStripeCustomerIdColumn } from '@/lib/stripe/client';

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

    // Update Stripe's default payment method FIRST so it stays authoritative.
    // Previously this used a local getStripeClient() that read the wrong settings
    // schema and returned null, so the Stripe default was never actually updated —
    // the local flag and Stripe drifted apart. Use the shared client.
    if (card.stripe_payment_method_id) {
      try {
        const stripe = await getStripeClient();
        const stripeColumn = await getStripeCustomerIdColumn();

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
      } catch (stripeError) {
        logger.error({ stripeError, customerId, cardId }, 'Failed to update Stripe default — aborting');
        return NextResponse.json(
          { error: 'Could not update the default card with the payment processor. Please try again.' },
          { status: 502 }
        );
      }
    }

    // Unset all other defaults for this customer, then set this card as default
    await supabase
      .from('saved_cards')
      .update({ is_default: false })
      .eq('customer_id', customerId);

    const { error: updateError } = await supabase
      .from('saved_cards')
      .update({ is_default: true })
      .eq('id', cardId)
      .eq('customer_id', customerId);

    if (updateError) {
      logger.error({ updateError, customerId, cardId }, 'Failed to set default card');
      return NextResponse.json({ error: 'Failed to set default card' }, { status: 500 });
    }

    logger.info({ customerId, cardId }, '✅ Default card set successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to set default payment method');
    return NextResponse.json({ error: 'Failed to set default payment method' }, { status: 500 });
  }
}
