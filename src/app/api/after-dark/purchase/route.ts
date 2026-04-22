/**
 * API: Purchase After Dark booking with saved payment method
 * Creates booking + processes Stripe payment in one step
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getStripeClient, getStripeCustomerIdColumn } from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/payment-methods';
import { applyGiftCardBalance, getUserGiftCardBalance } from '@/lib/services/gift-cards';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const MAX_KIDS = 40;
const PRICE_PER_KID = 50;

const WaiverDataSchema = z.object({
  emergency_contact_name: z.string().min(1),
  emergency_contact_phone: z.string().min(1),
  emergency_contact_relationship: z.string().min(1),
  authorized_pickup: z.string().min(1),
  allergies: z.string().optional().default(''),
  medical_conditions: z.string().optional().default(''),
  photo_consent: z.boolean(),
  signature: z.string().min(1),
});

const PurchaseSchema = z.object({
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  num_kids: z.number().int().min(1).max(10),
  kid_details: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  paymentMethodId: z.string().min(1),
  useGiftCardBalance: z.boolean().optional().default(true),
  booking_id: z.string().uuid().optional(),
  waiver: WaiverDataSchema.optional(),
});

function getReturnUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    if (siteUrl.startsWith('http://') || siteUrl.startsWith('https://')) {
      return `${siteUrl}/customer/dashboard?tab=after-dark`;
    }
    return `https://${siteUrl}/customer/dashboard?tab=after-dark`;
  }
  return 'https://busybeesipc.com/customer/dashboard?tab=after-dark';
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = PurchaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { event_date, num_kids, kid_details, notes, paymentMethodId, useGiftCardBalance, booking_id, waiver } = parsed.data;
    const adminSupabase = createAdminClient();

    // Get customer profile
    const { data: profile } = await adminSupabase
      .from('users')
      .select('name, email, phone')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
    }

    // Check capacity
    const { data: existing } = await adminSupabase
      .from('after_dark_bookings')
      .select('num_kids')
      .eq('event_date', event_date)
      .neq('status', 'cancelled');

    const currentBooked = (existing || []).reduce((sum, b) => sum + b.num_kids, 0);
    const remaining = MAX_KIDS - currentBooked;

    if (num_kids > remaining) {
      return NextResponse.json({
        error: remaining === 0
          ? 'Sorry, this event is fully booked!'
          : `Only ${remaining} spot${remaining === 1 ? '' : 's'} remaining.`,
      }, { status: 400 });
    }

    // Calculate price
    const totalAmount = num_kids * PRICE_PER_KID;
    let amountToCharge = totalAmount;
    let giftCardAmountUsed = 0;

    // Check gift card balance
    if (useGiftCardBalance) {
      const giftCardBalance = await getUserGiftCardBalance(user.id);
      if (giftCardBalance > 0) {
        giftCardAmountUsed = Math.min(giftCardBalance, totalAmount);
        amountToCharge = totalAmount - giftCardAmountUsed;
      }
    }

    // Validate payment method belongs to customer
    const customerIdColumn = await getStripeCustomerIdColumn();
    const { data: customerData } = await adminSupabase
      .from('users')
      .select(customerIdColumn)
      .eq('id', user.id)
      .single();

    const stripeCustomerId = (customerData as Record<string, string | null> | null)?.[customerIdColumn] ||
      await getOrCreateStripeCustomer(
        user.id,
        profile.email || user.email || '',
        profile.name || 'Customer',
        profile.phone || undefined
      );

    let stripePaymentIntentId: string | null = null;

    if (amountToCharge > 0) {
      const stripe = await getStripeClient();
      const amountInCents = Math.round(amountToCharge * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        metadata: {
          customer_id: user.id,
          type: 'after_dark',
          event_date,
          num_kids: String(num_kids),
          gift_card_amount: String(giftCardAmountUsed),
          original_amount: String(totalAmount),
          direct_payment: 'true',
        },
        confirm: true,
        off_session: false,
        return_url: getReturnUrl(),
      });

      if (paymentIntent.status === 'requires_action') {
        return NextResponse.json({
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
        });
      }

      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json({ error: 'Payment failed. Please try again.' }, { status: 400 });
      }

      stripePaymentIntentId = paymentIntent.id;
    } else {
      stripePaymentIntentId = `giftcard_${Date.now()}`;
    }

    // Create or update booking
    let booking;
    if (booking_id) {
      // Update existing booking with payment info
      const { data, error: updateError } = await adminSupabase
        .from('after_dark_bookings')
        .update({
          amount_paid: totalAmount,
          stripe_payment_intent_id: stripePaymentIntentId,
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking_id)
        .select()
        .single();

      if (updateError) {
        logger.error({ error: updateError }, 'Failed to update After Dark booking with payment');
        return NextResponse.json({ error: 'Payment processed but booking update failed. Please contact us.' }, { status: 500 });
      }
      booking = data;
    } else {
      // Create new booking
      const { data, error: bookingError } = await adminSupabase
        .from('after_dark_bookings')
        .insert({
          event_date,
          parent_name: profile.name || 'Customer',
          parent_email: profile.email || user.email || '',
          parent_phone: profile.phone || '',
          num_kids,
          kid_details: kid_details || null,
          notes: notes || null,
          status: 'confirmed',
          amount_paid: totalAmount,
          stripe_payment_intent_id: stripePaymentIntentId,
          waiver_signed: !!waiver,
        })
        .select()
        .single();

      if (bookingError) {
        logger.error({ error: bookingError }, 'Failed to create After Dark booking after payment');
        return NextResponse.json({ error: 'Payment processed but booking failed. Please contact us.' }, { status: 500 });
      }
      booking = data;

      // Save waiver if provided
      if (waiver) {
        const { error: waiverError } = await adminSupabase
          .from('after_dark_waivers')
          .insert({
            booking_id: booking.id,
            parent_name: profile.name || 'Customer',
            parent_email: profile.email || user.email || '',
            parent_phone: profile.phone || '',
            child_names: kid_details || '',
            emergency_contact_name: waiver.emergency_contact_name,
            emergency_contact_phone: waiver.emergency_contact_phone,
            emergency_contact_relationship: waiver.emergency_contact_relationship,
            authorized_pickup: waiver.authorized_pickup,
            allergies: waiver.allergies || null,
            medical_conditions: waiver.medical_conditions || null,
            photo_consent: waiver.photo_consent,
            signature: waiver.signature,
            signed_at: new Date().toISOString(),
          });
        if (waiverError) {
          logger.error({ error: waiverError, bookingId: booking.id }, 'Failed to save After Dark waiver after payment');
        }
      }
    }

    // Deduct gift card if used
    if (giftCardAmountUsed > 0) {
      await applyGiftCardBalance(user.id, giftCardAmountUsed);
    }

    // Record a purchases row so After Dark revenue appears in reports
    const { error: purchaseError } = await adminSupabase
      .from('purchases')
      .insert({
        customer_id: user.id,
        type: 'after_dark',
        product_id: booking.id,
        name: `After Dark — ${event_date} (${num_kids} kid${num_kids > 1 ? 's' : ''})`,
        price: totalAmount,
        purchase_date: new Date().toISOString(),
        used_sessions: 0,
        total_sessions: num_kids,
        status: 'active',
        stripe_payment_intent_id: stripePaymentIntentId,
        gift_card_amount_used: giftCardAmountUsed,
      });

    if (purchaseError) {
      logger.error({ error: purchaseError, bookingId: booking.id }, 'Failed to record After Dark purchase');
    }

    logger.info({
      bookingId: booking.id,
      event_date,
      num_kids,
      totalAmount,
      amountCharged: amountToCharge,
      giftCardUsed: giftCardAmountUsed,
    }, 'After Dark booking purchased');

    return NextResponse.json({
      booking,
      amountPaid: totalAmount,
      giftCardAmountUsed,
      remaining: remaining - num_kids,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error({ error, message, stack }, 'After Dark purchase error');
    return NextResponse.json(
      { error: 'Internal server error', detail: message },
      { status: 500 }
    );
  }
}
