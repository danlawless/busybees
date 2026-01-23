/**
 * Direct Payment API Route
 * Processes payments using saved payment methods for authenticated customers
 * Enables one-click purchases without redirecting to Stripe Checkout
 *
 * Flow:
 * 1. Customer has saved payment methods
 * 2. Customer selects product and clicks "Buy Now"
 * 3. Payment is processed directly via Stripe PaymentIntent
 * 4. Purchase record is created in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripeClient, getStripeCustomerIdColumn, getStripeMode } from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/payment-methods';
import { applyGiftCardBalance, getUserGiftCardBalance } from '@/lib/services/gift-cards';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';
import { validateBirthdateForProduct, hasAgeRestriction } from '@/lib/utils/ageUtils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      productId,
      productName,
      productPrice,
      productDescription,
      purchaseType,
      childId,
      quantity = 1,
      paymentMethodId,
      useGiftCardBalance = true,
      metadata = {},
    } = body;

    // Validate required fields
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
      userId: user.id,
      productId,
      purchaseType,
      paymentMethodId: paymentMethodId.substring(0, 10) + '...', // Partial for security
    };

    logger.info(logContext, '💳 Processing direct payment');

    // Get user profile
    const customerIdColumn = await getStripeCustomerIdColumn();
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select(`*, ${customerIdColumn}`)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.error({ ...logContext, error: profileError }, 'Profile not found');
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify the payment method belongs to this customer AND matches current Stripe mode
    const adminSupabase = createAdminClient();
    const stripeMode = await getStripeMode();
    const { data: savedCard, error: cardError } = await adminSupabase
      .from('saved_cards')
      .select('*')
      .eq('customer_id', user.id)
      .eq('stripe_payment_method_id', paymentMethodId)
      .eq('stripe_mode', stripeMode)
      .single();

    if (cardError || !savedCard) {
      logger.warn({ ...logContext, stripeMode }, 'Payment method not found for customer in current mode');
      return NextResponse.json(
        { error: 'Invalid payment method. Please add a new card for this payment mode.' },
        { status: 400 }
      );
    }

    // Age gate validation for passes with age restrictions
    if (childId && hasAgeRestriction(productName)) {
      const { data: child } = await adminSupabase
        .from('children')
        .select('birthdate, name')
        .eq('id', childId)
        .single();

      if (child?.birthdate) {
        const validation = validateBirthdateForProduct(child.birthdate, productName);
        if (!validation.valid) {
          logger.warn(
            { ...logContext, childId, childName: child.name, childAge: validation.childAge },
            '❌ Age gate validation failed'
          );
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }
      }
    }

    // Calculate amounts
    const totalAmount = productPrice * quantity;
    let amountToCharge = totalAmount;
    let giftCardAmountUsed = 0;

    // Check and apply gift card balance if enabled
    if (useGiftCardBalance) {
      const giftCardBalance = await getUserGiftCardBalance(user.id);

      if (giftCardBalance > 0) {
        giftCardAmountUsed = Math.min(giftCardBalance, totalAmount);
        amountToCharge = totalAmount - giftCardAmountUsed;

        logger.info(
          { ...logContext, totalAmount, giftCardBalance, giftCardAmountUsed, amountToCharge },
          '🎁 Gift card balance applied'
        );
      }
    }

    // If gift card covers entire purchase, skip Stripe payment
    if (amountToCharge === 0) {
      logger.info({ ...logContext, amount: totalAmount }, '🎁 Purchase fully covered by gift card');

      await applyGiftCardBalance(user.id, giftCardAmountUsed);

      const purchase = await createPurchaseRecord(adminSupabase, {
        customerId: user.id,
        childId,
        purchaseType,
        productId,
        productName,
        totalAmount,
        paymentIntentId: `giftcard_${Date.now()}`,
      });

      return NextResponse.json({
        success: true,
        purchaseId: purchase.id,
        giftCardUsed: giftCardAmountUsed,
        message: `Purchase completed using $${giftCardAmountUsed.toFixed(2)} gift card balance!`,
      });
    }

    // Get or create Stripe customer
    const existingStripeCustomerId = profile[customerIdColumn];
    const stripeCustomerId =
      existingStripeCustomerId ||
      (await getOrCreateStripeCustomer(
        user.id,
        profile.email || user.email!,
        profile.name || '',
        profile.phone
      ));

    const stripe = await getStripeClient();
    const amountInCents = Math.round(amountToCharge * 100);

    // Create and confirm PaymentIntent with saved card
    const paymentIntent = await Sentry.startSpan(
      { op: 'stripe.payment', name: 'Create PaymentIntent' },
      async () => {
        return stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd',
          customer: stripeCustomerId,
          payment_method: paymentMethodId,
          description: productDescription || productName,
          metadata: {
            customer_id: user.id,
            product_id: productId,
            product_type: purchaseType,
            product_name: productName,
            child_id: childId || '',
            quantity: quantity.toString(),
            gift_card_amount: giftCardAmountUsed.toString(),
            original_amount: totalAmount.toString(),
            direct_payment: 'true',
            ...metadata,
          },
          confirm: true,
          off_session: false, // Customer is present
          return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/customer/purchases`, // For 3DS if needed
        });
      }
    );

    // Handle different payment states
    if (paymentIntent.status === 'requires_action') {
      // 3D Secure authentication required
      logger.info({ ...logContext, paymentIntentId: paymentIntent.id }, '🔐 3DS required');

      return NextResponse.json({
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        message: 'Additional authentication required',
      });
    }

    if (paymentIntent.status !== 'succeeded') {
      logger.error(
        { ...logContext, paymentIntentId: paymentIntent.id, status: paymentIntent.status },
        '❌ Payment not successful'
      );

      return NextResponse.json(
        { error: `Payment failed: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    // Payment succeeded - apply gift card balance if used
    if (giftCardAmountUsed > 0) {
      await applyGiftCardBalance(user.id, giftCardAmountUsed);
    }

    // Create purchase record
    const purchase = await createPurchaseRecord(adminSupabase, {
      customerId: user.id,
      childId,
      purchaseType,
      productId,
      productName,
      totalAmount,
      paymentIntentId: paymentIntent.id,
    });

    logger.info(
      {
        ...logContext,
        purchaseId: purchase.id,
        paymentIntentId: paymentIntent.id,
        amountCharged: amountToCharge,
      },
      '✅ Direct payment completed successfully'
    );

    Sentry.addBreadcrumb({
      category: 'stripe.payment',
      message: 'Direct payment successful',
      level: 'info',
      data: {
        purchaseId: purchase.id,
        amount: amountToCharge,
        purchaseType,
      },
    });

    return NextResponse.json({
      success: true,
      purchaseId: purchase.id,
      paymentIntentId: paymentIntent.id,
      amountCharged: amountToCharge,
      giftCardUsed: giftCardAmountUsed,
      message: giftCardAmountUsed > 0
        ? `Payment of $${amountToCharge.toFixed(2)} processed (+ $${giftCardAmountUsed.toFixed(2)} gift card credit)`
        : `Payment of $${amountToCharge.toFixed(2)} processed successfully!`,
    });
  } catch (error) {
    logger.error({ error }, '❌ Direct payment failed');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'direct_payment' },
    });

    // Handle specific Stripe errors
    if (error instanceof Error) {
      const stripeError = error as any;
      if (stripeError.type === 'StripeCardError') {
        return NextResponse.json(
          { error: stripeError.message || 'Card declined' },
          { status: 400 }
        );
      }
      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          { error: 'Invalid payment request. Please try again.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to process payment. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Creates a purchase record in the database
 */
async function createPurchaseRecord(
  supabase: ReturnType<typeof createAdminClient>,
  params: {
    customerId: string;
    childId?: string;
    purchaseType: string;
    productId: string;
    productName: string;
    totalAmount: number;
    paymentIntentId: string;
  }
) {
  const now = new Date();
  let expiryDate = null;
  let totalSessions = 1;

  // Calculate expiry based on purchase type
  switch (params.purchaseType) {
    case 'day_pass':
      expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days to use
      totalSessions = 1;
      break;
    case 'weekly_pass':
      expiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days to use
      totalSessions = 999;
      break;
    case 'monthly_pass':
      expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year to use
      totalSessions = 999;
      break;
    case 'party_package':
      expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days to book
      totalSessions = 1;
      break;
  }

  const { data: purchase, error: dbError } = await supabase
    .from('purchases')
    .insert({
      customer_id: params.customerId,
      child_id: params.childId || null,
      type: params.purchaseType,
      product_id: params.productId,
      name: params.productName,
      price: params.totalAmount,
      purchase_date: now.toISOString(),
      expiry_date: expiryDate?.toISOString() || null,
      used_sessions: 0,
      total_sessions: totalSessions,
      status: 'active',
      stripe_payment_intent_id: params.paymentIntentId,
    })
    .select()
    .single();

  if (dbError) {
    logger.error({ error: dbError, customerId: params.customerId }, 'Failed to create purchase');
    throw dbError;
  }

  return purchase;
}

