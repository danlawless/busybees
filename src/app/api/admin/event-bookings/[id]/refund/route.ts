/**
 * Admin Event Booking Refund
 * POST - Process Stripe refund and cancel booking + linked purchases
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Get booking
    const { data: booking, error: fetchError } = await supabase
      .from('event_bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    // Process Stripe refund if payment was made via Stripe
    if (booking.stripe_payment_intent_id && !booking.stripe_payment_intent_id.startsWith('giftcard_')) {
      try {
        const stripe = await getStripeClient();
        await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
          reason: 'requested_by_customer',
          metadata: {
            booking_id: id,
            type: 'event_booking_refund',
          },
        });
        logger.info({ bookingId: id }, 'Event booking Stripe refund processed');
      } catch (stripeError) {
        logger.error({ error: stripeError, bookingId: id }, 'Stripe refund failed');
        return NextResponse.json({ error: 'Stripe refund failed. Please process manually.' }, { status: 500 });
      }
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('event_bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      logger.error({ error: updateError }, 'Failed to update booking status after refund');
      return NextResponse.json({ error: 'Refund processed but failed to update booking status' }, { status: 500 });
    }

    // Expire linked purchases
    if (booking.purchase_ids && booking.purchase_ids.length > 0) {
      await supabase
        .from('purchases')
        .update({ status: 'expired' })
        .in('id', booking.purchase_ids);
    }

    logger.info({ bookingId: id, parentName: booking.parent_name }, 'Event booking refunded and cancelled');

    return NextResponse.json({
      success: true,
      message: booking.stripe_payment_intent_id ? 'Refund processed and booking cancelled' : 'Booking cancelled',
    });
  } catch (error) {
    logger.error({ error }, 'Event booking refund error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
