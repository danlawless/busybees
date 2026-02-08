/**
 * Gift Card Verification & Fulfillment API Route
 *
 * The primary path for gift card creation after Stripe payment.
 * When payment is confirmed, this endpoint creates the gift card
 * and sends the email immediately — no dependency on the webhook.
 *
 * Flow:
 * 1. Verify Stripe checkout session is paid
 * 2. Check if gift card already exists (webhook may have created it)
 * 3. If not, create it now, send the email, and mark as sent
 * 4. Return complete status to the success page
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/server';
import { createGiftCard, markGiftCardAsSent } from '@/lib/services/gift-cards';
import { sendGiftCardEmail } from '@/lib/email/resend';
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

    const metadata = session.metadata;
    const supabase = createAdminClient();

    // Check if gift card already exists (webhook or previous call may have created it)
    const { data: existingCard } = await supabase
      .from('gift_cards')
      .select('id, code, amount, recipient_name, recipient_email, purchaser_name, delivery_method, status, email_sent_at')
      .eq('stripe_checkout_session_id', sessionId)
      .single();

    if (existingCard) {
      return NextResponse.json({
        status: 'complete',
        payment_status: 'paid',
        gift_card: {
          amount: Number(existingCard.amount),
          recipient_name: existingCard.recipient_name,
          recipient_email: existingCard.recipient_email,
          purchaser_name: existingCard.purchaser_name,
          delivery_method: existingCard.delivery_method,
          email_sent: !!existingCard.email_sent_at,
          card_status: existingCard.status,
        },
      });
    }

    // Payment confirmed, no gift card yet — create it now
    logger.info({ sessionId }, 'Payment confirmed — creating gift card via verify endpoint');

    try {
      const giftCard = await createGiftCard({
        amount: parseFloat(metadata.amount),
        purchaser_user_id: metadata.purchaser_user_id || undefined,
        purchaser_email: metadata.purchaser_email,
        purchaser_name: metadata.purchaser_name,
        recipient_email: metadata.recipient_email,
        recipient_name: metadata.recipient_name,
        personal_message: metadata.personal_message || undefined,
        delivery_method: metadata.delivery_method as 'email_recipient' | 'email_self',
        stripe_checkout_session_id: sessionId,
        stripe_payment_intent_id: session.payment_intent as string,
      });

      logger.info(
        { giftCardId: giftCard.id, code: giftCard.code, sessionId },
        'Gift card created successfully'
      );

      // Send the email
      const deliveryEmail = metadata.delivery_method === 'email_self'
        ? metadata.purchaser_email
        : metadata.recipient_email;

      const emailResult = await sendGiftCardEmail({
        to: deliveryEmail,
        giftCard: {
          code: giftCard.code,
          amount: Number(giftCard.amount),
          recipientName: metadata.recipient_name,
          purchaserName: metadata.purchaser_name,
          personalMessage: metadata.personal_message || undefined,
        },
      });

      let emailSent = false;
      if (emailResult.success) {
        await markGiftCardAsSent(giftCard.id);
        emailSent = true;
        logger.info({ giftCardId: giftCard.id, to: deliveryEmail }, 'Gift card email sent');
      } else {
        logger.error({ error: emailResult.error, giftCardId: giftCard.id }, 'Failed to send gift card email');
      }

      return NextResponse.json({
        status: 'complete',
        payment_status: 'paid',
        gift_card: {
          amount: Number(giftCard.amount),
          recipient_name: giftCard.recipient_name,
          recipient_email: giftCard.recipient_email,
          purchaser_name: giftCard.purchaser_name,
          delivery_method: giftCard.delivery_method,
          email_sent: emailSent,
          card_status: emailSent ? 'sent' : 'pending',
        },
      });
    } catch (createError) {
      logger.error({ error: createError, sessionId }, 'Failed to create gift card');

      // Return processing so the UI can retry
      return NextResponse.json({
        status: 'processing',
        payment_status: 'paid',
        message: 'Payment confirmed. Please try again in a moment.',
        amount: metadata.amount ? parseFloat(metadata.amount) : null,
        recipient_name: metadata.recipient_name || null,
        recipient_email: metadata.recipient_email || null,
        purchaser_name: metadata.purchaser_name || null,
        delivery_method: metadata.delivery_method || null,
      });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to verify gift card purchase');
    return NextResponse.json(
      { error: 'Failed to verify purchase' },
      { status: 500 }
    );
  }
}
