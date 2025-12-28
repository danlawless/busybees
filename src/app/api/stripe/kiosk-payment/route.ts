/**
 * Kiosk Payment API Route
 * Processes self-serve payments at kiosks using customer's saved payment methods
 *
 * Security Model:
 * - Kiosk is a trusted device on a trusted network
 * - Customer is identified via phone/email lookup at the kiosk
 * - Payment method must belong to the identified customer
 * - All transactions are logged for audit trail
 *
 * Flow:
 * 1. Customer identifies themselves at kiosk (phone lookup)
 * 2. Kiosk loads their saved payment methods
 * 3. Customer selects product and confirms purchase
 * 4. This endpoint processes payment with their saved card
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripeClient, getStripeCustomerIdColumn } from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/payment-methods';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  const adminSupabase = createAdminClient();

  try {
    const body = await request.json();
    const {
      customerId,
      productId,
      productName,
      productPrice,
      productDescription,
      purchaseType,
      childId,
      quantity = 1,
      paymentMethodId,
      metadata = {},
    } = body;

    // Validate required fields
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID required. Please identify yourself at the kiosk.' },
        { status: 400 }
      );
    }

    if (!productId || !productName || productPrice === undefined || !purchaseType) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, productName, productPrice, purchaseType' },
        { status: 400 }
      );
    }

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method required. Please add a payment method first.' },
        { status: 400 }
      );
    }

    const logContext = {
      customerId,
      productId,
      purchaseType,
      paymentMethodId: paymentMethodId.substring(0, 10) + '...',
      source: 'kiosk',
    };

    logger.info(logContext, '🏪 Processing kiosk self-serve payment');

    // Get customer profile
    const customerIdColumn = await getStripeCustomerIdColumn();
    const { data: customer, error: customerError } = await adminSupabase
      .from('users')
      .select(`id, email, name, phone, ${customerIdColumn}`)
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      logger.error({ ...logContext, error: customerError }, 'Customer not found');
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Verify the payment method belongs to this customer
    const { data: savedCard, error: cardError } = await adminSupabase
      .from('saved_cards')
      .select('*')
      .eq('customer_id', customerId)
      .eq('stripe_payment_method_id', paymentMethodId)
      .single();

    if (cardError || !savedCard) {
      logger.warn({ ...logContext }, 'Payment method not found for customer');
      return NextResponse.json(
        { error: 'Invalid payment method. Please select a valid saved card.' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const existingStripeCustomerId = customer[customerIdColumn];
    const stripeCustomerId = existingStripeCustomerId || await getOrCreateStripeCustomer(
      customer.id,
      customer.email || '',
      customer.name || '',
      customer.phone
    );

    const stripe = await getStripeClient();
    const amountInCents = Math.round(productPrice * quantity * 100);

    // Create and confirm payment intent with saved card
    let paymentIntent;
    try {
      // Build description with quantity
      const paymentDescription = quantity > 1
        ? `${quantity}x ${productName}`
        : (productDescription || productName);

      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        description: paymentDescription,
        metadata: {
          customer_id: customerId,
          product_id: productId,
          purchase_type: purchaseType,
          child_id: childId || '',
          product_name: productName,
          quantity: quantity.toString(),
          kiosk_transaction: 'true',
          ...metadata,
        },
        confirm: true,
        off_session: true,
      });
    } catch (stripeError: any) {
      logger.error({ ...logContext, stripeError: stripeError.message }, '❌ Stripe payment failed');

      // Handle specific Stripe errors
      if (stripeError.code === 'authentication_required') {
        return NextResponse.json(
          {
            error: 'This card requires additional verification. Please use a different card.',
            requires_action: true,
          },
          { status: 400 }
        );
      }

      if (stripeError.code === 'card_declined') {
        return NextResponse.json(
          { error: 'Card declined. Please try a different card.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: stripeError.message || 'Payment processing failed. Please try again.' },
        { status: 400 }
      );
    }

    // Verify payment succeeded
    if (paymentIntent.status !== 'succeeded') {
      logger.warn({ ...logContext, status: paymentIntent.status }, 'Payment not completed');
      return NextResponse.json(
        { error: `Payment not completed. Status: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    logger.info({ ...logContext, paymentIntentId: paymentIntent.id }, '💳 Kiosk payment succeeded');

// Calculate expiry date and sessions based on purchase type
    const now = new Date();
    let expiryDate: Date | null = null;
    let sessionsPerUnit = 1;

    if (purchaseType === 'day_pass') {
      // Day passes: 1 session per pass, multiply by quantity
      sessionsPerUnit = 1;
    } else if (purchaseType === 'weekly_pass') {
      // Punch cards: 10 sessions per card
      sessionsPerUnit = 10;
    } else if (purchaseType === 'monthly_pass') {
      // Monthly: unlimited sessions
      sessionsPerUnit = 999;
    } else if (purchaseType === 'party_package') {
      // Party packages have 90-day booking window
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 90);
      sessionsPerUnit = 1;
    } else if (purchaseType === 'food_beverage') {
      // Food/beverage items are immediately "used"
      sessionsPerUnit = 1;
    }

    // Calculate total sessions (multiply by quantity for stackable passes)
    const totalSessions = purchaseType === 'monthly_pass' 
      ? 999 // Unlimited doesn't multiply
      : sessionsPerUnit * quantity;

    // Build product name with quantity
    const purchaseName = quantity > 1 
      ? `${quantity}x ${productName}` 
      : productName;

    // Create purchase record (matching POS endpoint structure)
    // Note: productPrice already includes quantity * discount from frontend
    const { data: purchase, error: purchaseError } = await adminSupabase
      .from('purchases')
      .insert({
        customer_id: customerId,
        child_id: childId || null,
        type: purchaseType,
        product_id: productId,
        name: purchaseName,
        price: productPrice, // Already includes quantity + discount
        purchase_date: now.toISOString(),
        expiry_date: expiryDate?.toISOString() || null,
        used_sessions: 0,
        total_sessions: totalSessions,
        status: purchaseType === 'food_beverage' ? 'used' : 'active',
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select()
      .single();

    if (purchaseError) {
      logger.error({ ...logContext, error: purchaseError }, '❌ Failed to create purchase record');
      Sentry.captureException(purchaseError, {
        tags: { component: 'kiosk-payment', action: 'create_purchase' },
        extra: { customerId, paymentIntentId: paymentIntent.id },
      });

      // Payment succeeded but record failed - this needs manual review
      return NextResponse.json(
        {
          error: 'Payment processed but failed to create record. Please contact staff.',
          paymentIntentId: paymentIntent.id,
        },
        { status: 500 }
      );
    }

    logger.info(
      { ...logContext, purchaseId: purchase.id, paymentIntentId: paymentIntent.id },
      '✅ Kiosk purchase completed successfully'
    );

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase.id,
        type: purchase.type,
        name: purchase.name,
        price: purchase.price,
        status: purchase.status,
      },
      payment: {
        id: paymentIntent.id,
        amount: amountInCents,
        cardLast4: savedCard.last4,
        cardBrand: savedCard.brand,
      },
    });

  } catch (error) {
    logger.error({ error }, '❌ Kiosk payment error');
    Sentry.captureException(error, {
      tags: { component: 'kiosk-payment' },
    });

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again or contact staff.' },
      { status: 500 }
    );
  }
}

