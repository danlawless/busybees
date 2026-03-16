/**
 * API Route: Party Guest Overage Payment
 * GET - Fetch saved cards for the booking's customer
 * POST - Process one-time payment for extra kids beyond included 15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripeClient, getStripeCustomerIdColumn, getStripeMode } from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/payment-methods';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const INCLUDED_KIDS = 15;
const EXTRA_KID_PRICE = 15;

const OveragePaymentSchema = z.object({
  payment_method: z.enum(['saved_card', 'cash']),
  payment_method_id: z.string().min(1).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = createAdminClient();

    // Get the booking to find customer_id
    const { data: booking, error: bookingError } = await supabase
      .from('party_bookings')
      .select('id, customer_id, customer_name')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!booking.customer_id) {
      return NextResponse.json({ savedCards: [], message: 'No linked customer account' });
    }

    // Fetch saved cards for this customer
    const stripeMode = await getStripeMode();
    const { data: savedCards, error } = await supabase
      .from('saved_cards')
      .select('id, stripe_payment_method_id, last4, brand, expiry_month, expiry_year, is_default')
      .eq('customer_id', booking.customer_id)
      .eq('stripe_mode', stripeMode)
      .order('is_default', { ascending: false });

    if (error) {
      logger.error({ error, bookingId }, 'Failed to fetch customer saved cards for overage');
      return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
    }

    return NextResponse.json({ savedCards: savedCards || [] });
  } catch (error) {
    logger.error({ error }, 'Overage payment GET error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const body = await request.json();
    const parsed = OveragePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { payment_method, payment_method_id } = parsed.data;
    const supabase = createAdminClient();

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('party_bookings')
      .select('id, customer_id, customer_name, customer_email, customer_phone')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Count guests to calculate overage
    const { count, error: countError } = await supabase
      .from('party_guests')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', bookingId);

    if (countError) {
      return NextResponse.json({ error: 'Failed to count guests' }, { status: 500 });
    }

    const guestCount = count || 0;
    const extraKids = Math.max(0, guestCount - INCLUDED_KIDS);

    if (extraKids === 0) {
      return NextResponse.json({ error: 'No overage to charge — guest count is within included limit' }, { status: 400 });
    }

    const totalAmount = extraKids * EXTRA_KID_PRICE;
    const amountInCents = totalAmount * 100;

    let paymentIntentId: string | null = null;

    if (payment_method === 'saved_card') {
      if (!payment_method_id) {
        return NextResponse.json({ error: 'Payment method ID required for card payment' }, { status: 400 });
      }

      if (!booking.customer_id) {
        return NextResponse.json({ error: 'No linked customer account for card payment' }, { status: 400 });
      }

      // Verify the payment method belongs to this customer
      const stripeMode = await getStripeMode();
      const { data: savedCard, error: cardError } = await supabase
        .from('saved_cards')
        .select('stripe_payment_method_id, last4, brand')
        .eq('customer_id', booking.customer_id)
        .eq('stripe_payment_method_id', payment_method_id)
        .eq('stripe_mode', stripeMode)
        .single();

      if (cardError || !savedCard) {
        return NextResponse.json({ error: 'Payment method not found' }, { status: 400 });
      }

      // Get or create Stripe customer
      const customerIdColumn = await getStripeCustomerIdColumn();
      const { data: customer } = await supabase
        .from('users')
        .select(`id, email, name, phone, ${customerIdColumn}`)
        .eq('id', booking.customer_id)
        .single();

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      const existingStripeCustomerId = customer[customerIdColumn];
      const stripeCustomerId = existingStripeCustomerId || await getOrCreateStripeCustomer(
        customer.id,
        customer.email || '',
        customer.name || '',
        customer.phone
      );

      const stripe = await getStripeClient();

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: payment_method_id,
        description: `Party guest overage: ${extraKids} extra ${extraKids === 1 ? 'child' : 'children'} — ${booking.customer_name}`,
        metadata: {
          customer_id: booking.customer_id,
          booking_id: bookingId,
          extra_kids: extraKids.toString(),
          price_per_child: EXTRA_KID_PRICE.toString(),
          payment_type: 'party_overage',
        },
        confirm: true,
        off_session: true,
      });

      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { error: `Payment not completed. Status: ${paymentIntent.status}` },
          { status: 400 }
        );
      }

      paymentIntentId = paymentIntent.id;
    }
    // Cash payment: no Stripe processing needed

    // Update booking with overage info
    const { error: updateError } = await supabase
      .from('party_bookings')
      .update({
        additional_kids: extraKids,
        additional_kids_price: totalAmount,
      })
      .eq('id', bookingId);

    if (updateError) {
      logger.error({ error: updateError, bookingId }, 'Failed to update booking overage');
    }

    logger.info(
      { bookingId, extraKids, totalAmount, paymentMethod: payment_method, paymentIntentId },
      'Party overage payment processed'
    );

    return NextResponse.json({
      success: true,
      payment: {
        amount: totalAmount,
        extraKids,
        method: payment_method,
        paymentIntentId,
      },
    });
  } catch (error) {
    const stripeError = error as { code?: string; message?: string };
    if (stripeError.code === 'card_declined') {
      return NextResponse.json({ error: 'Card declined. Please try a different card.' }, { status: 400 });
    }
    if (stripeError.code === 'authentication_required') {
      return NextResponse.json({ error: 'Card requires additional verification.' }, { status: 400 });
    }
    logger.error({ error }, 'Overage payment error');
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
  }
}
