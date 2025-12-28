/**
 * POS Purchase API Route
 * Handles in-person purchases with immediate payment processing
 * Creates Stripe PaymentIntent and saves to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripeClient, getStripeCustomerIdColumn } from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/payment-methods';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check staff/admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Staff only' }, { status: 403 });
    }

    const body = await request.json();
    const {
      customer_id,
      product_id,
      product_name,
      product_price,
      product_description,
      purchase_type,
      child_id,
      quantity = 1,
      metadata = {},
    } = body;

    // Validate required fields
    if (!customer_id || !product_id || !product_name || product_price === undefined || !purchase_type) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_id, product_id, product_name, product_price, purchase_type' },
        { status: 400 }
      );
    }

    // Get customer details for Stripe
    const adminSupabase = createAdminClient();
    const customerIdColumn = await getStripeCustomerIdColumn();

    const { data: customer } = await adminSupabase
      .from('users')
      .select(`id, email, name, phone, ${customerIdColumn}`)
      .eq('id', customer_id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    logger.info({ customer_id, product_name, purchase_type }, 'Processing POS purchase');

    // Get or create Stripe customer (mode-aware)
    const existingStripeCustomerId = customer[customerIdColumn];
    const stripeCustomerId = existingStripeCustomerId || await getOrCreateStripeCustomer(
      customer.id,
      customer.email || '',
      customer.name || '',
      customer.phone
    );

    // Create Stripe PaymentIntent
    const stripe = await getStripeClient();
    const amountInCents = Math.round(product_price * quantity * 100);

    // For POS transactions, create a PaymentIntent and immediately confirm with test card
    // In production, this would integrate with a physical card reader
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: stripeCustomerId,
      description: product_description || product_name,
      metadata: {
        customer_id,
        product_id,
        purchase_type,
        child_id: child_id || '',
        product_name,
        quantity: quantity.toString(),
        pos_transaction: 'true',
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    // For test mode, confirm with test payment method
    // In production, this would be confirmed by card reader
    if (paymentIntent.status === 'requires_payment_method') {
      await stripe.paymentIntents.confirm(paymentIntent.id, {
        payment_method: 'pm_card_visa', // Stripe test payment method
      });
    }

    logger.info({ paymentIntentId: paymentIntent.id, status: paymentIntent.status }, 'PaymentIntent created and confirmed');

    // Calculate expiry dates based on purchase type
    const now = new Date();
    let expiryDate = null;
    let totalSessions = 1;

    if (purchase_type === 'day_pass') {
      expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days to start using
      totalSessions = 1;
    } else if (purchase_type === 'weekly_pass') {
      expiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days to start using
      totalSessions = 999; // Unlimited
    } else if (purchase_type === 'monthly_pass') {
      expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year to start using
      totalSessions = 999; // Unlimited
    } else if (purchase_type === 'party_package') {
      expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days to book
      totalSessions = 1;
    } else if (purchase_type === 'food_beverage') {
      expiryDate = null; // No expiry for food/beverage
      totalSessions = 1;
    }

    // Save purchase to database
    const { data: purchase, error: dbError } = await adminSupabase
      .from('purchases')
      .insert({
        customer_id,
        child_id: child_id || null,
        type: purchase_type,
        product_id,
        name: product_name,
        price: product_price * quantity,
        purchase_date: now.toISOString(),
        expiry_date: expiryDate?.toISOString() || null,
        used_sessions: 0,
        total_sessions: totalSessions,
        status: purchase_type === 'food_beverage' ? 'used' : 'active',
        stripe_payment_intent_id: paymentIntent.id,
        party_date: metadata.party_date || null,
        party_start_time: metadata.party_time || null,
        party_guests: metadata.party_guests ? parseInt(metadata.party_guests) : null,
        party_notes: metadata.party_notes || null,
      })
      .select()
      .single();

    if (dbError) {
      logger.error({ error: dbError, customer_id }, 'Failed to save purchase to database');
      throw dbError;
    }

    logger.info({ purchaseId: purchase.id, customer_id }, 'Purchase saved successfully');

    return NextResponse.json({
      success: true,
      purchase,
      payment_intent_id: paymentIntent.id,
      payment_status: paymentIntent.status,
    }, { status: 201 });

  } catch (error) {
    logger.error({ error }, 'POS purchase failed');
    console.error('POS purchase error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process purchase',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

