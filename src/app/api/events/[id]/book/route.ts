/**
 * Event Booking API
 * POST /api/events/[id]/book - Book an event: create purchases per child + event_booking record
 * Follows the After Dark purchase pattern with Stripe saved card payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getStripeClient, getStripeCustomerIdColumn } from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/payment-methods';
import { applyGiftCardBalance, getUserGiftCardBalance } from '@/lib/services/gift-cards';
import { resolvePurchaseDefaults } from '@/lib/utils/purchaseDefaults';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const BookEventSchema = z.object({
  children: z.array(z.object({
    child_id: z.string().uuid(),
    pass_id: z.string().uuid(),
  })).min(1).max(10),
  paymentMethodId: z.string().min(1),
  useGiftCardBalance: z.boolean().optional().default(true),
  notes: z.string().max(500).optional(),
});

function getReturnUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    if (siteUrl.startsWith('http://') || siteUrl.startsWith('https://')) {
      return `${siteUrl}/customer/dashboard?tab=events`;
    }
    return `https://${siteUrl}/customer/dashboard?tab=events`;
  }
  return 'https://busybeesipc.com/customer/dashboard?tab=events';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = BookEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { children, paymentMethodId, useGiftCardBalance, notes } = parsed.data;
    const adminSupabase = createAdminClient();

    // Fetch event
    const { data: event, error: eventError } = await adminSupabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('is_bookable', true)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found or not bookable' }, { status: 404 });
    }

    // Check capacity
    if (event.max_capacity) {
      const { data: existing } = await adminSupabase
        .from('event_bookings')
        .select('num_children')
        .eq('event_id', eventId)
        .neq('status', 'cancelled');

      const currentBooked = (existing || []).reduce((sum: number, b: { num_children: number }) => sum + b.num_children, 0);
      const remaining = event.max_capacity - currentBooked;

      if (children.length > remaining) {
        return NextResponse.json({
          error: remaining === 0
            ? 'Sorry, this event is fully booked!'
            : `Only ${remaining} spot${remaining === 1 ? '' : 's'} remaining.`,
        }, { status: 400 });
      }
    }

    // Get customer profile
    const { data: profile } = await adminSupabase
      .from('users')
      .select('name, email, phone')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
    }

    // Fetch pass prices and children details
    const passIds = [...new Set(children.map(c => c.pass_id))];
    const { data: passes } = await adminSupabase
      .from('passes')
      .select('id, name, price, sessions_included, duration, category')
      .in('id', passIds);

    if (!passes || passes.length === 0) {
      return NextResponse.json({ error: 'Invalid pass selection' }, { status: 400 });
    }

    const passMap = new Map(passes.map(p => [p.id, p]));

    const childIds = children.map(c => c.child_id);
    const { data: childrenData } = await adminSupabase
      .from('children')
      .select('id, name, date_of_birth')
      .in('id', childIds);

    const childMap = new Map((childrenData || []).map(c => [c.id, c]));

    // Calculate total price
    let totalAmount = 0;
    for (const child of children) {
      const pass = passMap.get(child.pass_id);
      if (!pass) {
        return NextResponse.json({ error: `Pass not found: ${child.pass_id}` }, { status: 400 });
      }
      totalAmount += pass.price;
    }

    // Gift card handling
    let amountToCharge = totalAmount;
    let giftCardAmountUsed = 0;

    if (useGiftCardBalance) {
      const giftCardBalance = await getUserGiftCardBalance(user.id);
      if (giftCardBalance > 0) {
        giftCardAmountUsed = Math.min(giftCardBalance, totalAmount);
        amountToCharge = totalAmount - giftCardAmountUsed;
      }
    }

    // Get Stripe customer
    const customerIdColumn = getStripeCustomerIdColumn();
    const { data: customerData } = await adminSupabase
      .from('users')
      .select(`${customerIdColumn}`)
      .eq('id', user.id)
      .single();

    const stripeCustomerId = customerData?.[customerIdColumn] ||
      await getOrCreateStripeCustomer(user.id, adminSupabase);

    // Process Stripe payment
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
          type: 'event_booking',
          event_id: eventId,
          event_title: event.title,
          num_children: String(children.length),
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

    // Create purchase records (one per child) for check-in compatibility
    const purchaseIds: string[] = [];
    const childDetails: Array<{ child_id: string; name: string; age: number | null; pass_name: string; purchase_id: string }> = [];
    const now = new Date();

    for (const child of children) {
      const pass = passMap.get(child.pass_id)!;
      const childInfo = childMap.get(child.child_id);

      // Resolve expiry from pass config
      const { totalSessions, expiryDate } = await resolvePurchaseDefaults(
        child.pass_id,
        pass.category === 'day' ? 'day_pass' : pass.category === 'weekly' ? 'weekly_pass' : 'monthly_pass',
        adminSupabase,
      );

      const { data: purchase, error: purchaseError } = await adminSupabase
        .from('purchases')
        .insert({
          customer_id: user.id,
          child_id: child.child_id,
          type: pass.category === 'day' ? 'day_pass' : pass.category === 'weekly' ? 'weekly_pass' : 'monthly_pass',
          product_id: child.pass_id,
          name: pass.name,
          price: pass.price,
          purchase_date: now.toISOString(),
          expiry_date: expiryDate?.toISOString() || null,
          used_sessions: 0,
          total_sessions: totalSessions,
          status: 'active',
          stripe_payment_intent_id: stripePaymentIntentId,
        })
        .select()
        .single();

      if (purchaseError) {
        logger.error({ error: purchaseError, childId: child.child_id }, 'Failed to create event purchase');
        continue;
      }

      purchaseIds.push(purchase.id);

      // Calculate age
      let age: number | null = null;
      if (childInfo?.date_of_birth) {
        const dob = new Date(childInfo.date_of_birth);
        age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }

      childDetails.push({
        child_id: child.child_id,
        name: childInfo?.name || 'Unknown',
        age,
        pass_name: pass.name,
        purchase_id: purchase.id,
      });
    }

    // Create event_booking record
    const { data: booking, error: bookingError } = await adminSupabase
      .from('event_bookings')
      .insert({
        event_id: eventId,
        event_date: event.event_date,
        customer_id: user.id,
        parent_name: profile.name || 'Customer',
        parent_email: profile.email || user.email || '',
        parent_phone: profile.phone || '',
        num_children: children.length,
        child_details: childDetails,
        notes: notes || null,
        status: 'confirmed',
        total_amount: totalAmount,
        stripe_payment_intent_id: stripePaymentIntentId,
        purchase_ids: purchaseIds,
      })
      .select()
      .single();

    if (bookingError) {
      logger.error({ error: bookingError }, 'Failed to create event booking record');
      // Purchases were already created, so the customer can still check in
      // but the admin dashboard won't show this booking
    }

    // Deduct gift card if used
    if (giftCardAmountUsed > 0) {
      await applyGiftCardBalance(user.id, giftCardAmountUsed);
    }

    logger.info({
      bookingId: booking?.id,
      eventId,
      eventTitle: event.title,
      numChildren: children.length,
      totalAmount,
      amountCharged: amountToCharge,
      giftCardUsed: giftCardAmountUsed,
    }, 'Event booking purchased');

    return NextResponse.json({
      booking,
      purchaseIds,
      amountPaid: totalAmount,
      giftCardAmountUsed,
    }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Event booking error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
