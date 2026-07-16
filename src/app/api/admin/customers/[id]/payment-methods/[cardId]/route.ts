/**
 * API Route: Admin Customer Payment Method
 * DELETE - Remove a saved payment method
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getStripeClient } from '@/lib/stripe/client';

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

    // Detach from Stripe FIRST, and only delete the local row if that succeeds
    // (or the card is already gone from Stripe). Stripe is the source of truth
    // for syncPaymentMethodsToDatabase — if we delete the row while the card is
    // still attached in Stripe, the next payment-methods sync re-adds it and the
    // removal "reappears". Use the shared client so we hit the correct account.
    if (card.stripe_payment_method_id) {
      try {
        const stripe = await getStripeClient();
        await stripe.paymentMethods.detach(card.stripe_payment_method_id);
        logger.info({ paymentMethodId: card.stripe_payment_method_id }, '✅ Detached from Stripe');
      } catch (stripeError) {
        // 'resource_missing' means the payment method is already detached/gone —
        // safe to proceed. Any other error means the card is still attached, so
        // we must NOT delete the local row (it would just get re-synced back).
        const code = (stripeError as { code?: string })?.code;
        if (code !== 'resource_missing') {
          logger.error(
            { stripeError, paymentMethodId: card.stripe_payment_method_id },
            'Failed to detach card from Stripe — aborting delete'
          );
          return NextResponse.json(
            { error: 'Could not remove the card from the payment processor. Please try again.' },
            { status: 502 }
          );
        }
        logger.warn(
          { paymentMethodId: card.stripe_payment_method_id },
          'Payment method already detached in Stripe — proceeding with local delete'
        );
      }
    }

    // Delete from database (card is now confirmed gone from Stripe)
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
