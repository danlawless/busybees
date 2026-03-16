/**
 * API Route: Gift Card Refund
 * POST - Refund the remaining balance on a gift card back to the original card via Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: giftCardId } = await params;

  try {
    const supabase = createAdminClient();

    // Fetch the gift card
    const { data: giftCard, error: fetchError } = await supabase
      .from('gift_cards')
      .select('id, code, amount, remaining_amount, status, stripe_payment_intent_id, purchaser_name, purchaser_email')
      .eq('id', giftCardId)
      .single();

    if (fetchError || !giftCard) {
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
    }

    const remainingAmount = Number(giftCard.remaining_amount);

    if (remainingAmount <= 0) {
      return NextResponse.json(
        { error: 'No remaining balance to refund' },
        { status: 400 }
      );
    }

    if (giftCard.status === 'pending') {
      return NextResponse.json(
        { error: 'Cannot refund a gift card that has not been sent yet' },
        { status: 400 }
      );
    }

    if (!giftCard.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'No Stripe payment found for this gift card' },
        { status: 400 }
      );
    }

    // Process partial refund via Stripe for the remaining balance
    const stripe = await getStripeClient();
    const refundAmountCents = Math.round(remainingAmount * 100);

    logger.info(
      { giftCardId, code: giftCard.code, refundAmount: remainingAmount },
      'Processing gift card refund'
    );

    const refund = await stripe.refunds.create({
      payment_intent: giftCard.stripe_payment_intent_id,
      amount: refundAmountCents,
      reason: 'requested_by_customer',
      metadata: {
        gift_card_id: giftCardId,
        gift_card_code: giftCard.code,
        refund_type: 'gift_card_remaining_balance',
      },
    });

    // Update gift card: zero out remaining balance and mark as redeemed
    const { error: updateError } = await supabase
      .from('gift_cards')
      .update({
        remaining_amount: 0,
        status: 'redeemed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', giftCardId);

    if (updateError) {
      logger.error(
        { error: updateError, giftCardId, refundId: refund.id },
        'Refund processed but failed to update gift card record'
      );
    }

    logger.info(
      { giftCardId, refundId: refund.id, amount: remainingAmount },
      'Gift card refund completed'
    );

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      refundAmount: remainingAmount,
      message: `$${remainingAmount.toFixed(2)} refunded to original payment method`,
    });
  } catch (error) {
    const stripeError = error as { type?: string; code?: string; message?: string };

    if (stripeError.code === 'charge_already_refunded') {
      return NextResponse.json(
        { error: 'This gift card has already been fully refunded.' },
        { status: 400 }
      );
    }

    logger.error({ error, giftCardId }, 'Gift card refund failed');
    return NextResponse.json(
      { error: stripeError.message || 'Failed to process refund' },
      { status: 500 }
    );
  }
}
