/**
 * POS Purchase API Route
 * Handles in-person purchases with immediate payment processing
 * Creates Stripe PaymentIntent and saves to database
 *
 * Supports multiple payment methods:
 * - 'terminal': Use Stripe Terminal (card reader) - requires terminal_payment_intent_id
 * - 'saved_card': Use a saved payment method - requires payment_method_id
 * - 'test': Auto-confirm with test card (development only)
 * - 'cash': Record as cash transaction (no Stripe processing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripeClient, getStripeCustomerIdColumn, getStripeMode } from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/payment-methods';
import { logger } from '@/lib/logger';
import { validateBirthdateForProduct, hasAgeRestriction } from '@/lib/utils/ageUtils';

type PaymentMethod = 'terminal' | 'saved_card' | 'test' | 'cash';

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
      // Payment method options
      payment_method = 'test' as PaymentMethod,
      payment_method_id, // For saved_card
      terminal_payment_intent_id, // For terminal (already confirmed via Terminal SDK)
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

    // Age gate validation for passes with age restrictions
    if (child_id && hasAgeRestriction(product_name)) {
      const { data: child } = await adminSupabase
        .from('children')
        .select('birthdate, name')
        .eq('id', child_id)
        .single();

      if (child?.birthdate) {
        const validation = validateBirthdateForProduct(child.birthdate, product_name);
        if (!validation.valid) {
          logger.warn(
            { customer_id, child_id, childName: child.name, childAge: validation.childAge, product_name },
            '❌ Age gate validation failed'
          );
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }
      }
    }

    logger.info({ customer_id, product_name, purchase_type, payment_method }, 'Processing POS purchase');

    // Get or create Stripe customer (mode-aware)
    const existingStripeCustomerId = customer[customerIdColumn];
    const stripeCustomerId = existingStripeCustomerId || await getOrCreateStripeCustomer(
      customer.id,
      customer.email || '',
      customer.name || '',
      customer.phone
    );

    const stripe = await getStripeClient();
    const stripeMode = await getStripeMode();
    const amountInCents = Math.round(product_price * quantity * 100);

    let paymentIntentId: string | null = null;
    let paymentStatus: string = 'succeeded';

    // Handle different payment methods
    if (payment_method === 'terminal') {
      // Terminal payment - PaymentIntent already created and confirmed via Terminal SDK
      if (!terminal_payment_intent_id) {
        return NextResponse.json(
          { error: 'terminal_payment_intent_id required for Terminal payments' },
          { status: 400 }
        );
      }

      // Verify the PaymentIntent exists and is successful
      const paymentIntent = await stripe.paymentIntents.retrieve(terminal_payment_intent_id);

      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { error: `Terminal payment not completed. Status: ${paymentIntent.status}` },
          { status: 400 }
        );
      }

      paymentIntentId = terminal_payment_intent_id;
      paymentStatus = paymentIntent.status;

      logger.info(
        { paymentIntentId, status: paymentStatus },
        '💳 Terminal payment verified'
      );

    } else if (payment_method === 'saved_card') {
      // Use a saved payment method
      if (!payment_method_id) {
        return NextResponse.json(
          { error: 'payment_method_id required for saved card payments' },
          { status: 400 }
        );
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: payment_method_id,
        description: product_description || product_name,
        metadata: {
          customer_id,
          product_id,
          purchase_type,
          child_id: child_id || '',
          product_name,
          quantity: quantity.toString(),
          pos_transaction: 'true',
          payment_method_type: 'saved_card',
          ...metadata,
        },
        confirm: true,
        off_session: true,
      });

      paymentIntentId = paymentIntent.id;
      paymentStatus = paymentIntent.status;

      logger.info(
        { paymentIntentId, status: paymentStatus },
        '💳 Saved card payment processed'
      );

    } else if (payment_method === 'cash') {
      // Cash payment - no Stripe processing
      paymentIntentId = null;
      paymentStatus = 'cash';

      logger.info({ customer_id, amount: amountInCents }, '💵 Cash payment recorded');

    } else {
      // Test mode - create and auto-confirm with test card
      // Only allowed in test mode
      if (stripeMode === 'live') {
        return NextResponse.json(
          { error: 'Test payment method not allowed in live mode. Use terminal, saved_card, or cash.' },
          { status: 400 }
        );
      }

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
          payment_method_type: 'test',
          ...metadata,
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      // Auto-confirm with test card in test mode
      if (paymentIntent.status === 'requires_payment_method') {
        await stripe.paymentIntents.confirm(paymentIntent.id, {
          payment_method: 'pm_card_visa',
        });
      }

      paymentIntentId = paymentIntent.id;
      paymentStatus = 'succeeded';

      logger.info(
        { paymentIntentId, status: paymentStatus },
        '🧪 Test payment processed'
      );
    }

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
        stripe_payment_intent_id: paymentIntentId,
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

    logger.info(
      { purchaseId: purchase.id, customer_id, payment_method },
      'Purchase saved successfully'
    );

    return NextResponse.json({
      success: true,
      purchase,
      payment_intent_id: paymentIntentId,
      payment_status: paymentStatus,
      payment_method,
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

