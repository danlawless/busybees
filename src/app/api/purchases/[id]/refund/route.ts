/**
 * API Route: Purchase Refund
 * POST - Process a refund for a purchase via Stripe
 *
 * Note: POS staff access is controlled via PIN at the application level.
 * This endpoint is only accessible from the admin panel after PIN verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

type AdminSupabase = ReturnType<typeof createAdminClient>;

async function cancelLinkedAfterDarkBooking(
  supabase: AdminSupabase,
  bookingId: string,
  logContext: Record<string, unknown>
) {
  const { error } = await supabase
    .from('after_dark_bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .neq('status', 'cancelled');

  if (error) {
    logger.error({ ...logContext, bookingId, error }, 'Failed to cancel After Dark booking after refund');
    Sentry.captureException(error, {
      tags: { component: 'api', action: 'after_dark_booking_cancel_on_refund' },
      extra: { bookingId },
    });
  } else {
    logger.info({ ...logContext, bookingId }, 'After Dark booking cancelled after purchase refund');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: purchaseId } = await params;

  const logContext = { purchaseId };
  logger.info(logContext, '💰 Processing refund request');

  try {
    const supabase = createAdminClient();

    // 1. Get the purchase from database
    const { data: purchase, error: fetchError } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', purchaseId)
      .single();

    if (fetchError || !purchase) {
      logger.warn({ ...logContext, error: fetchError }, 'Purchase not found');
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }

    // 2. Check if purchase has a Stripe payment intent
    const paymentIntentId = purchase.stripe_payment_intent_id;

    if (!paymentIntentId) {
      logger.warn(logContext, 'No payment intent found for purchase');
      return NextResponse.json(
        { error: 'No payment record found for this purchase. It may have been a cash or gift card purchase.' },
        { status: 400 }
      );
    }

    // Skip Stripe refund for gift card purchases (they start with 'giftcard_')
    if (paymentIntentId.startsWith('giftcard_')) {
      logger.info(logContext, 'Gift card purchase - marking as refunded without Stripe call');

      // Just update the status in the database
      const { error: updateError } = await supabase
        .from('purchases')
        .update({ status: 'refunded' })
        .eq('id', purchaseId);

      if (updateError) {
        logger.error({ ...logContext, error: updateError }, 'Failed to update purchase status');
        throw updateError;
      }

      if (purchase.type === 'after_dark' && purchase.product_id) {
        await cancelLinkedAfterDarkBooking(supabase, purchase.product_id, logContext);
      }

      return NextResponse.json({
        success: true,
        message: 'Gift card purchase marked as refunded',
        purchaseId,
      });
    }

    // 3. Process refund via Stripe
    const stripe = await getStripeClient();

    logger.info({ ...logContext, paymentIntentId }, 'Creating Stripe refund');

    const refund = await Sentry.startSpan(
      { op: 'stripe.refund', name: 'Create Refund' },
      async (span) => {
        span.setAttribute('payment_intent_id', paymentIntentId);
        span.setAttribute('purchase_id', purchaseId);

        return stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: 'requested_by_customer',
          metadata: {
            purchase_id: purchaseId,
            customer_id: purchase.customer_id,
            refund_source: 'pos_admin',
          },
        });
      }
    );

    logger.info(
      { ...logContext, refundId: refund.id, refundStatus: refund.status },
      '✅ Stripe refund created'
    );

    // 4. Update purchase status in database
    const { error: updateError } = await supabase
      .from('purchases')
      .update({ status: 'refunded' })
      .eq('id', purchaseId);

    if (updateError) {
      logger.error({ ...logContext, error: updateError }, 'Failed to update purchase status after refund');
      // The refund was processed, but DB update failed - log to Sentry
      Sentry.captureException(updateError, {
        tags: { component: 'api', action: 'refund_db_update' },
        extra: { purchaseId, refundId: refund.id },
      });
      // Still return success since the refund was processed
    }

    if (purchase.type === 'after_dark' && purchase.product_id) {
      await cancelLinkedAfterDarkBooking(supabase, purchase.product_id, logContext);
    }

    Sentry.addBreadcrumb({
      category: 'stripe.refund',
      message: 'Refund processed successfully',
      level: 'info',
      data: {
        purchaseId,
        refundId: refund.id,
        amount: refund.amount,
      },
    });

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      refundStatus: refund.status,
      amount: refund.amount / 100, // Convert cents to dollars
      purchaseId,
      message: `Refund of $${(refund.amount / 100).toFixed(2)} processed successfully`,
    });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Refund processing failed');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'process_refund' },
      extra: { purchaseId },
    });

    // Handle specific Stripe errors
    if (error instanceof Error) {
      const stripeError = error as { type?: string; message?: string; code?: string };

      if (stripeError.type === 'StripeInvalidRequestError') {
        // Check for common refund errors
        if (stripeError.code === 'charge_already_refunded') {
          return NextResponse.json(
            { error: 'This purchase has already been refunded.' },
            { status: 400 }
          );
        }
        if (stripeError.code === 'charge_expired_for_refund') {
          return NextResponse.json(
            { error: 'This purchase is too old to refund via the original payment method.' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: stripeError.message || 'Invalid refund request' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to process refund. Please try again or contact support.' },
      { status: 500 }
    );
  }
}
