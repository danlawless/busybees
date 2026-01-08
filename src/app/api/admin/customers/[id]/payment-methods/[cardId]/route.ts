/**
 * API Route: Admin Customer Payment Method
 * DELETE - Remove a saved payment method
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  try {
    const { id: customerId, cardId } = await params;

    logger.info({ customerId, cardId }, '🗑️ Deleting payment method');

    const supabase = createAdminClient();

    // Get the card details to find Stripe payment method ID
    const { data: card, error: cardError } = await supabase
      .from('saved_cards')
      .select('stripe_payment_method_id')
      .eq('id', cardId)
      .eq('customer_id', customerId)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Delete from Stripe if we have a payment method ID
    if (card.stripe_payment_method_id) {
      const stripe = await getStripeClient();
      if (stripe) {
        try {
          await stripe.paymentMethods.detach(card.stripe_payment_method_id);
          logger.info({ paymentMethodId: card.stripe_payment_method_id }, '✅ Detached from Stripe');
        } catch (stripeError) {
          logger.warn({ stripeError }, 'Failed to detach from Stripe (continuing with local delete)');
        }
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('saved_cards')
      .delete()
      .eq('id', cardId)
      .eq('customer_id', customerId);

    if (error) {
      logger.error({ error, customerId, cardId }, 'Failed to delete card');
      return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
    }

    logger.info({ customerId, cardId }, '✅ Card deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete payment method');
    return NextResponse.json({ error: 'Failed to delete payment method' }, { status: 500 });
  }
}
