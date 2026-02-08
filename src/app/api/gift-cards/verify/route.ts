/**
 * Gift Card Verification API Route
 * Verifies a Stripe checkout session and returns gift card details
 * Called by the success page to confirm payment and show real data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id parameter' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const stripe = await getStripeClient();
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (stripeError) {
      logger.error({ error: stripeError, sessionId }, 'Failed to retrieve Stripe checkout session');
      return NextResponse.json(
        { error: 'Invalid or expired checkout session' },
        { status: 404 }
      );
    }

    // Verify this is a gift card session
    if (session.metadata?.type !== 'gift_card') {
      return NextResponse.json(
        { error: 'This session is not a gift card purchase' },
        { status: 400 }
      );
    }

    // Check payment status
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        status: 'payment_pending',
        payment_status: session.payment_status,
        message: 'Payment has not been completed yet',
      });
    }

    // Look up the gift card in the database by checkout session ID
    const supabase = createAdminClient();
    const { data: giftCard, error: dbError } = await supabase
      .from('gift_cards')
      .select('id, code, amount, recipient_name, recipient_email, purchaser_name, delivery_method, status, email_sent_at')
      .eq('stripe_checkout_session_id', sessionId)
      .single();

    if (dbError || !giftCard) {
      // Gift card not yet created by webhook - return payment confirmed but pending
      logger.info(
        { sessionId },
        'Gift card payment confirmed but record not yet created (webhook pending)'
      );
      return NextResponse.json({
        status: 'processing',
        payment_status: 'paid',
        message: 'Payment confirmed. Gift card is being created...',
        amount: session.metadata?.amount ? parseFloat(session.metadata.amount) : null,
        recipient_name: session.metadata?.recipient_name || null,
        recipient_email: session.metadata?.recipient_email || null,
        purchaser_name: session.metadata?.purchaser_name || null,
        delivery_method: session.metadata?.delivery_method || null,
      });
    }

    // Gift card exists - return full details
    return NextResponse.json({
      status: 'complete',
      payment_status: 'paid',
      gift_card: {
        amount: Number(giftCard.amount),
        recipient_name: giftCard.recipient_name,
        recipient_email: giftCard.recipient_email,
        purchaser_name: giftCard.purchaser_name,
        delivery_method: giftCard.delivery_method,
        email_sent: !!giftCard.email_sent_at,
        card_status: giftCard.status,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to verify gift card purchase');
    return NextResponse.json(
      { error: 'Failed to verify purchase' },
      { status: 500 }
    );
  }
}
