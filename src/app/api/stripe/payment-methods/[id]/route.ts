/**
 * Stripe Payment Methods API - Individual Payment Method Operations
 * DELETE - Remove a payment method
 * PATCH - Update payment method (set as default)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeCustomerIdColumn } from '@/lib/stripe/client';
import {
  detachPaymentMethod,
  deletePaymentMethodFromDatabase,
  setDefaultPaymentMethod,
} from '@/lib/stripe/payment-methods';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentMethodId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the payment method belongs to the user
    const { data: savedCard } = await supabase
      .from('saved_cards')
      .select('*')
      .eq('stripe_payment_method_id', paymentMethodId)
      .eq('customer_id', user.id)
      .single();

    if (!savedCard) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Detach from Stripe
    await detachPaymentMethod(paymentMethodId);

    // Delete from database
    await deletePaymentMethodFromDatabase(paymentMethodId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete payment method',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentMethodId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { setAsDefault } = body;

    if (!setAsDefault) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Verify the payment method belongs to the user
    const { data: savedCard } = await supabase
      .from('saved_cards')
      .select('*')
      .eq('stripe_payment_method_id', paymentMethodId)
      .eq('customer_id', user.id)
      .single();

    if (!savedCard) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Get user's Stripe customer ID (mode-aware)
    const customerIdColumn = await getStripeCustomerIdColumn();
    const { data: profile } = await supabase
      .from('users')
      .select(`${customerIdColumn}`)
      .eq('id', user.id)
      .single();

    const stripeCustomerId = profile?.[customerIdColumn];

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'Stripe customer not found' },
        { status: 404 }
      );
    }

    // Set as default in Stripe
    await setDefaultPaymentMethod(stripeCustomerId, paymentMethodId);

    // Update database - unset all defaults first
    await supabase
      .from('saved_cards')
      .update({ is_default: false })
      .eq('customer_id', user.id);

    // Set this one as default
    await supabase
      .from('saved_cards')
      .update({ is_default: true })
      .eq('stripe_payment_method_id', paymentMethodId)
      .eq('customer_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating payment method:', error);
    return NextResponse.json(
      {
        error: 'Failed to update payment method',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

