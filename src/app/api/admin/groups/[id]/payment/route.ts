/**
 * API Route: Group Payment
 * GET - Fetch saved cards for a group account
 * POST - Process payment for active group children ($10/child)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripeClient, getStripeCustomerIdColumn, getStripeMode } from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/payment-methods';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const PRICE_PER_CHILD = 10;

const GroupPaymentSchema = z.object({
  payment_method_id: z.string().min(1, 'Payment method required'),
  active_child_ids: z.array(z.string().uuid()).min(1, 'At least one active child required'),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const supabase = createAdminClient();

    // Fetch saved cards for this group account
    const stripeMode = await getStripeMode();
    const { data: savedCards, error } = await supabase
      .from('saved_cards')
      .select('id, stripe_payment_method_id, last4, brand, expiry_month, expiry_year, is_default')
      .eq('customer_id', groupId)
      .eq('stripe_mode', stripeMode)
      .order('is_default', { ascending: false });

    if (error) {
      logger.error({ error, groupId }, 'Failed to fetch group saved cards');
      return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
    }

    return NextResponse.json({ savedCards: savedCards || [] });
  } catch (error) {
    logger.error({ error }, 'Group payment GET error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const body = await request.json();
    const parsed = GroupPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { payment_method_id, active_child_ids } = parsed.data;
    const supabase = createAdminClient();

    // Verify group exists
    const customerIdColumn = await getStripeCustomerIdColumn();
    const { data: group, error: groupError } = await supabase
      .from('users')
      .select(`id, name, email, phone, group_name, ${customerIdColumn}`)
      .eq('id', groupId)
      .eq('is_group', true)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Verify children belong to this group
    const { data: children, error: childError } = await supabase
      .from('children')
      .select('id, name')
      .eq('customer_id', groupId)
      .in('id', active_child_ids);

    if (childError || !children || children.length !== active_child_ids.length) {
      return NextResponse.json({ error: 'Some children not found in this group' }, { status: 400 });
    }

    // Verify payment method belongs to this group
    const stripeMode = await getStripeMode();
    const { data: savedCard, error: cardError } = await supabase
      .from('saved_cards')
      .select('stripe_payment_method_id, last4, brand')
      .eq('customer_id', groupId)
      .eq('stripe_payment_method_id', payment_method_id)
      .eq('stripe_mode', stripeMode)
      .single();

    if (cardError || !savedCard) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 400 });
    }

    // Calculate amount
    const childCount = active_child_ids.length;
    const totalAmount = childCount * PRICE_PER_CHILD;
    const amountInCents = totalAmount * 100;

    // Get or create Stripe customer
    const existingStripeCustomerId = group[customerIdColumn];
    const stripeCustomerId = existingStripeCustomerId || await getOrCreateStripeCustomer(
      group.id,
      group.email || '',
      group.name || '',
      group.phone
    );

    const stripe = await getStripeClient();

    // Create and confirm payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: payment_method_id,
      description: `Group visit: ${group.group_name || group.name} — ${childCount} children`,
      metadata: {
        customer_id: groupId,
        group_name: group.group_name || group.name,
        child_count: childCount.toString(),
        price_per_child: PRICE_PER_CHILD.toString(),
        group_payment: 'true',
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

    // Create purchase record
    const now = new Date();
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        customer_id: groupId,
        type: 'day_pass',
        product_id: null,
        name: `Group Visit — ${childCount} children @ $${PRICE_PER_CHILD}/each`,
        price: totalAmount,
        purchase_date: now.toISOString(),
        expiry_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        used_sessions: 0,
        total_sessions: 1,
        status: 'active',
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select()
      .single();

    if (purchaseError) {
      logger.error({ error: purchaseError }, 'Failed to create group purchase record');
    }

    logger.info(
      { groupId, childCount, total: totalAmount, paymentIntentId: paymentIntent.id },
      'Group payment processed successfully'
    );

    return NextResponse.json({
      success: true,
      payment: {
        id: paymentIntent.id,
        amount: totalAmount,
        childCount,
        cardLast4: savedCard.last4,
        cardBrand: savedCard.brand,
      },
      purchaseId: purchase?.id,
    });
  } catch (error) {
    const stripeError = error as { code?: string; message?: string };
    if (stripeError.code === 'card_declined') {
      return NextResponse.json({ error: 'Card declined. Please try a different card.' }, { status: 400 });
    }
    if (stripeError.code === 'authentication_required') {
      return NextResponse.json({ error: 'Card requires additional verification.' }, { status: 400 });
    }
    logger.error({ error }, 'Group payment error');
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
  }
}
