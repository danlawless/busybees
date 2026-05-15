/**
 * POS API: Staff-initiated After Dark booking
 * Lets POS staff create + pay for an After Dark booking on behalf of a customer
 * using one of the customer's saved cards (off-session charge).
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

const PosBookingSchema = z.object({
  customer_id: z.string().uuid(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  num_kids: z.number().int().min(1).max(10),
  paymentMethodId: z.string().min(1),
  kid_details: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  useGiftCardBalance: z.boolean().optional().default(true),
  waiver: WaiverDataSchema,
});

export async function POST(request: NextRequest) {
  try {
    // Verify authenticated user (must be staff/admin OR the customer themselves)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = PosBookingSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { customer_id, event_date, num_kids, paymentMethodId, kid_details, notes, useGiftCardBalance, waiver } = parsed.data;

    const { data: authUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaffOrAdmin = authUser && ['staff', 'admin'].includes(authUser.role);
    const isSelfBooking = user.id === customer_id;

    if (!isStaffOrAdmin && !isSelfBooking) {
      return NextResponse.json(
        { error: 'Forbidden — must be staff, or booking for yourself.' },
        { status: 403 }
      );
    }
    const adminSupabase = createAdminClient();
    const customerIdColumn = await getStripeCustomerIdColumn();

    const { data: customer } = await adminSupabase
      .from('users')
      .select(`id, name, email, phone, ${customerIdColumn}`)
      .eq('id', customer_id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check event capacity
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
          ? 'This event is fully booked.'
          : `Only ${remaining} spot${remaining === 1 ? '' : 's'} remaining.`,
      }, { status: 400 });
    }

    // Compute charge after optional gift-card application
    const totalAmount = num_kids * PRICE_PER_KID;
    let amountToCharge = totalAmount;
    let giftCardAmountUsed = 0;

    if (useGiftCardBalance) {
      const giftCardBalance = await getUserGiftCardBalance(customer_id);
      if (giftCardBalance > 0) {
        giftCardAmountUsed = Math.min(giftCardBalance, totalAmount);
        amountToCharge = totalAmount - giftCardAmountUsed;
      }
    }

    // Resolve Stripe customer ID (create if missing)
    const customerRecord = customer as Record<string, string | null>;
    const stripeCustomerId =
      customerRecord[customerIdColumn] ||
      await getOrCreateStripeCustomer(
        customer.id,
        customer.email || '',
        customer.name || 'Customer',
        customer.phone || undefined
      );

    let stripePaymentIntentId: string | null = null;

    if (amountToCharge > 0) {
      const stripe = await getStripeClient();
      const amountInCents = Math.round(amountToCharge * 100);

      // When on-session (customer present), Stripe requires return_url for
      // potential 3DS redirects. Off-session staff charges don't need it.
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';
      const returnUrl = siteUrl.startsWith('http') ? `${siteUrl}/pos` : `https://${siteUrl}/pos`;

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd',
          customer: stripeCustomerId,
          payment_method: paymentMethodId,
          metadata: {
            customer_id: customer.id,
            initiated_by: user.id,
            initiated_by_role: isStaffOrAdmin ? (authUser?.role || 'staff') : 'customer',
            type: 'after_dark',
            event_date,
            num_kids: String(num_kids),
            gift_card_amount: String(giftCardAmountUsed),
            original_amount: String(totalAmount),
            pos_transaction: 'true',
          },
          confirm: true,
          off_session: isStaffOrAdmin,
          ...(isStaffOrAdmin ? {} : { return_url: returnUrl }),
        });

        if (paymentIntent.status !== 'succeeded') {
          logger.warn(
            { paymentIntentId: paymentIntent.id, status: paymentIntent.status },
            'POS After Dark payment did not succeed'
          );
          return NextResponse.json({
            error: paymentIntent.status === 'requires_action'
              ? 'This card requires customer verification — ask the customer to complete the booking from their account.'
              : 'Payment failed. Try a different card.',
          }, { status: 400 });
        }

        stripePaymentIntentId = paymentIntent.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment failed';
        logger.error({ error: err, customer_id, paymentMethodId }, 'POS After Dark off-session charge failed');
        return NextResponse.json({ error: message }, { status: 400 });
      }
    } else {
      stripePaymentIntentId = `giftcard_${Date.now()}`;
    }

    // Create the booking
    const { data: booking, error: bookingError } = await adminSupabase
      .from('after_dark_bookings')
      .insert({
        event_date,
        parent_name: customer.name || 'Customer',
        parent_email: customer.email || '',
        parent_phone: customer.phone || '',
        num_kids,
        kid_details: kid_details || null,
        notes: notes ? `[POS] ${notes}` : '[POS booking]',
        status: 'confirmed',
        amount_paid: totalAmount,
        stripe_payment_intent_id: stripePaymentIntentId,
        waiver_signed: true,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      logger.error(
        { error: bookingError, customer_id, paymentIntentId: stripePaymentIntentId },
        'POS After Dark: payment succeeded but booking insert failed'
      );
      return NextResponse.json(
        { error: 'Payment processed but booking record failed — please contact support.' },
        { status: 500 }
      );
    }

    // Save waiver (always required for POS bookings)
    const { error: waiverError } = await adminSupabase
      .from('after_dark_waivers')
      .insert({
        booking_id: booking.id,
        parent_name: customer.name || 'Customer',
        parent_email: customer.email || '',
        parent_phone: customer.phone || '',
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
      logger.error({ error: waiverError, bookingId: booking.id }, 'POS After Dark: failed to save waiver');
    }

    // Deduct gift card balance after booking is persisted
    if (giftCardAmountUsed > 0) {
      await applyGiftCardBalance(customer_id, giftCardAmountUsed);
    }

    // Record purchases row so AfterDark revenue lands in reports
    const { error: purchaseError } = await adminSupabase
      .from('purchases')
      .insert({
        customer_id,
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
      logger.error({ error: purchaseError, bookingId: booking.id }, 'POS After Dark: failed to record purchases row');
    }

    logger.info(
      {
        bookingId: booking.id,
        customer_id,
        initiated_by: user.id,
        initiated_by_role: isStaffOrAdmin ? (authUser?.role || 'staff') : 'customer',
        event_date,
        num_kids,
        totalAmount,
        amountCharged: amountToCharge,
        giftCardUsed: giftCardAmountUsed,
      },
      '🌙 POS After Dark booking created'
    );

    return NextResponse.json({
      booking,
      amountPaid: totalAmount,
      giftCardAmountUsed,
      remaining: remaining - num_kids,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error, message }, 'POS After Dark booking error');
    return NextResponse.json({ error: 'Internal server error', detail: message }, { status: 500 });
  }
}
