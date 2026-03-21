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
 *
 * Follows the same structural pattern as /api/purchases/pos:
 * - Admin client for ALL DB operations (avoids cookie-based auth issues)
 * - Direct .insert().select().single() + throw on error
 * - Error responses include `details` for visibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getStripeClient, getStripeCustomerIdColumn, getStripeMode } from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/payment-methods';
import { applyGiftCardBalance, getUserGiftCardBalance } from '@/lib/services/gift-cards';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';
import { validateBirthdateForProduct, hasAgeRestriction } from '@/lib/utils/ageUtils';
import { resolvePurchaseDefaults, checkDuplicateMonthlyPass } from '@/lib/utils/purchaseDefaults';
import { decrementInventoryAfterPurchase } from '@/lib/services/products';

/**
 * Get a valid return URL for Stripe 3DS redirect
 * Ensures URL has a valid scheme (https:// or http://)
 */
function getReturnUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (siteUrl) {
    if (siteUrl.startsWith('http://') || siteUrl.startsWith('https://')) {
      return `${siteUrl}/customer/purchases`;
    }
    return `https://${siteUrl}/customer/purchases`;
  }

  return 'https://busybeesipc.com/customer/purchases';
}

export async function POST(request: NextRequest) {
  try {
    // Auth check — only thing that needs the cookie-based client
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
      childrenIds = [] as string[],
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
      paymentMethodId: paymentMethodId.substring(0, 10) + '...',
    };

    logger.info(logContext, '💳 Processing direct payment');

    // Admin client for ALL DB operations (POS pattern — avoids cookie auth issues)
    const adminSupabase = createAdminClient();
    const customerIdColumn = await getStripeCustomerIdColumn();

    // Get user profile — using admin client (NOT cookie-based anon client)
    const { data: profile, error: profileError } = await adminSupabase
      .from('users')
      .select(`id, email, name, phone, ${customerIdColumn}`)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.error({ ...logContext, error: profileError }, 'Profile not found');
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify the payment method belongs to this customer AND matches current Stripe mode
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

    // Prevent duplicate monthly passes per child
    if (childId) {
      const duplicateError = await checkDuplicateMonthlyPass(childId, purchaseType, adminSupabase);
      if (duplicateError) {
        return NextResponse.json({ error: duplicateError }, { status: 400 });
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

    // Validate pass exists BEFORE any charge — fail fast if product is invalid
    let purchaseDefaults;
    try {
      purchaseDefaults = await resolvePurchaseDefaults(productId, purchaseType, adminSupabase);
    } catch (defaultsError) {
      logger.error({ ...logContext, error: defaultsError }, '❌ Invalid product — pass lookup failed');
      return NextResponse.json(
        { error: 'Invalid product. Could not find pass details.', details: defaultsError instanceof Error ? defaultsError.message : 'Unknown error' },
        { status: 400 }
      );
    }

    logger.info({ ...logContext, totalSessions: purchaseDefaults.totalSessions, expiryDate: purchaseDefaults.expiryDate }, '✅ Pass defaults resolved');

    const now = new Date();

    // If gift card covers entire purchase, skip Stripe payment
    if (amountToCharge === 0) {
      logger.info({ ...logContext, amount: totalAmount }, '🎁 Purchase fully covered by gift card');

      // Direct insert (POS pattern — no gift_card_amount_used, let DB DEFAULT handle it)
      const { data: purchase, error: dbError } = await adminSupabase
        .from('purchases')
        .insert({
          customer_id: user.id,
          child_id: childId || null,
          type: purchaseType,
          product_id: productId,
          name: productName,
          price: totalAmount,
          purchase_date: now.toISOString(),
          expiry_date: purchaseDefaults.expiryDate?.toISOString() || null,
          used_sessions: 0,
          total_sessions: purchaseDefaults.totalSessions,
          status: 'active',
          stripe_payment_intent_id: `giftcard_${Date.now()}`,
        })
        .select()
        .single();

      if (dbError) {
        logger.error({ error: dbError, customerId: user.id }, 'Failed to save gift-card purchase to database');
        throw dbError;
      }

      // Link children for family passes via purchase_children table
      if (childrenIds.length > 0) {
        const rows = childrenIds.map((cId: string) => ({ purchase_id: purchase.id, child_id: cId }));
        await adminSupabase.from('purchase_children').insert(rows);
      }

      // Deduct gift card and record amount used (separate update to avoid column-missing failures)
      await applyGiftCardBalance(user.id, giftCardAmountUsed);
      if (giftCardAmountUsed > 0) {
        await adminSupabase
          .from('purchases')
          .update({ gift_card_amount_used: giftCardAmountUsed })
          .eq('id', purchase.id);
      }

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
    const paymentIntent = await stripe.paymentIntents.create({
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
      off_session: false,
      return_url: getReturnUrl(),
    });

    // Handle different payment states
    if (paymentIntent.status === 'requires_action') {
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

    logger.info({ ...logContext, paymentIntentId: paymentIntent.id }, '✅ Stripe charge succeeded, saving purchase record');

    // Create purchase record — direct insert matching POS pattern exactly
    // Deliberately omits gift_card_amount_used from the insert to avoid column-missing failures
    const { data: purchase, error: dbError } = await adminSupabase
      .from('purchases')
      .insert({
        customer_id: user.id,
        child_id: childId || null,
        type: purchaseType,
        product_id: productId,
        name: productName,
        price: totalAmount,
        purchase_date: now.toISOString(),
        expiry_date: purchaseDefaults.expiryDate?.toISOString() || null,
        used_sessions: 0,
        total_sessions: purchaseDefaults.totalSessions,
        status: 'active',
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select()
      .single();

    if (dbError) {
      logger.error(
        { error: dbError, customerId: user.id, paymentIntentId: paymentIntent.id },
        '❌ CRITICAL: Stripe charged but DB insert failed — purchase not recorded'
      );
      throw dbError;
    }

    logger.info({ ...logContext, purchaseId: purchase.id }, '✅ Purchase record saved');

    // Link children for family passes via purchase_children table
    if (childrenIds.length > 0) {
      const rows = childrenIds.map((cId: string) => ({ purchase_id: purchase.id, child_id: cId }));
      await adminSupabase.from('purchase_children').insert(rows);
    }

    // Deduct gift card balance and record amount used (separate operations)
    if (giftCardAmountUsed > 0) {
      await applyGiftCardBalance(user.id, giftCardAmountUsed);
      await adminSupabase
        .from('purchases')
        .update({ gift_card_amount_used: giftCardAmountUsed })
        .eq('id', purchase.id);
    }

    // Decrement inventory for food/beverage purchases
    await decrementInventoryAfterPurchase(adminSupabase, productId, productName, quantity, purchaseType);

    logger.info(
      {
        ...logContext,
        purchaseId: purchase.id,
        paymentIntentId: paymentIntent.id,
        amountCharged: amountToCharge,
      },
      '✅ Direct payment completed successfully'
    );

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
      const stripeError = error as { type?: string; message: string };
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
      {
        error: 'Failed to process payment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

