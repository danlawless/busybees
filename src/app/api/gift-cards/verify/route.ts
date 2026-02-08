/**
 * Gift Card Verification API Route
 * Verifies a Stripe checkout session and returns gift card details
 * Called by the success page to confirm payment and show real data
 *
 * Self-healing: If payment is confirmed but the webhook hasn't created
 * the gift card record yet, this endpoint will create it directly.
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

    // Look up the gift card in the database by checkout session ID
    const supabase = createAdminClient();
    const { data: giftCard } = await supabase
      .from('gift_cards')
      .select('id, code, amount, recipient_name, recipient_email, purchaser_name, delivery_method, status, email_sent_at')
      .eq('stripe_checkout_session_id', sessionId)
      .single();

    if (giftCard) {
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
    }

    // Gift card not yet created by webhook — attempt self-healing creation
    // Only create if client explicitly requests it (after initial polling window)
    const shouldCreate = searchParams.get('create_if_missing') === 'true';

    if (!shouldCreate) {
      // Still in the initial polling window — let the webhook handle it
      logger.info(
        { sessionId },
        'Gift card payment confirmed but record not yet created (webhook pending)'
      );
      return NextResponse.json({
        status: 'processing',
        payment_status: 'paid',
        message: 'Payment confirmed. Gift card is being created...',
        amount: metadata.amount ? parseFloat(metadata.amount) : null,
        recipient_name: metadata.recipient_name || null,
        recipient_email: metadata.recipient_email || null,
        purchaser_name: metadata.purchaser_name || null,
        delivery_method: metadata.delivery_method || null,
      });
    }

    // Self-healing: create the gift card directly since webhook hasn't processed it
    logger.warn(
      { sessionId },
      'Webhook has not created gift card — self-healing by creating directly'
    );

    try {
      // Double-check it wasn't just created (race condition guard)
      const { data: recheck } = await supabase
        .from('gift_cards')
        .select('id, code, amount, recipient_name, recipient_email, purchaser_name, delivery_method, status, email_sent_at')
        .eq('stripe_checkout_session_id', sessionId)
        .single();

      if (recheck) {
        return NextResponse.json({
          status: 'complete',
          payment_status: 'paid',
          gift_card: {
            amount: Number(recheck.amount),
            recipient_name: recheck.recipient_name,
            recipient_email: recheck.recipient_email,
            purchaser_name: recheck.purchaser_name,
            delivery_method: recheck.delivery_method,
            email_sent: !!recheck.email_sent_at,
            card_status: recheck.status,
          },
        });
      }

      // Create the gift card
      const newGiftCard = await createGiftCard({
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
        { giftCardId: newGiftCard.id, sessionId },
        'Self-healed: gift card created via verify endpoint'
      );

      // Send the email
      const deliveryEmail = metadata.delivery_method === 'email_self'
        ? metadata.purchaser_email
        : metadata.recipient_email;

      const emailResult = await sendGiftCardEmail({
        to: deliveryEmail,
        giftCard: {
          code: newGiftCard.code,
          amount: Number(newGiftCard.amount),
          recipientName: metadata.recipient_name,
          purchaserName: metadata.purchaser_name,
          personalMessage: metadata.personal_message || undefined,
        },
      });

      let emailSent = false;
      if (emailResult.success) {
        await markGiftCardAsSent(newGiftCard.id);
        emailSent = true;
        logger.info({ giftCardId: newGiftCard.id, to: deliveryEmail }, 'Self-healed: gift card email sent');
      } else {
        logger.error({ error: emailResult.error, giftCardId: newGiftCard.id }, 'Self-heal: failed to send gift card email');
      }

      return NextResponse.json({
        status: 'complete',
        payment_status: 'paid',
        gift_card: {
          amount: Number(newGiftCard.amount),
          recipient_name: newGiftCard.recipient_name,
          recipient_email: newGiftCard.recipient_email,
          purchaser_name: newGiftCard.purchaser_name,
          delivery_method: newGiftCard.delivery_method,
          email_sent: emailSent,
          card_status: emailSent ? 'sent' : 'pending',
        },
      });
    } catch (createError) {
      logger.error({ error: createError, sessionId }, 'Self-heal: failed to create gift card');

      // Even if creation fails, return processing with metadata so the UI isn't stuck
      return NextResponse.json({
        status: 'processing',
        payment_status: 'paid',
        message: 'Payment confirmed. Your gift card is being prepared — please check your email shortly.',
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
