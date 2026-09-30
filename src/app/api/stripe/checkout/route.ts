/**
 * Stripe Checkout API Route
 * Create checkout sessions for purchases with gift card balance support
 * Supports both authenticated (user) and kiosk (customer_id) modes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import { applyGiftCardBalance, getUserGiftCardBalance } from '@/lib/services/gift-cards';
import { getStripeCustomerIdColumn } from '@/lib/stripe/client';
import { logger } from '@/lib/logger';
import { resolvePurchaseDefaults, resolvePassScope } from '@/lib/utils/purchaseDefaults';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      // Kiosk mode parameters - uses customer_id directly
      customer_id,
      customer_email,
      customer_name,
      product_id,
      product_name,
      product_price,
      product_description,
      purchase_type,
      child_id,
      success_url,
      cancel_url,
      // Authenticated mode parameters (camelCase)
      productId,
      productName,
      productPrice,
      productDescription,
      purchaseType,
      childId,
      quantity = 1,
      metadata = {},
      useGiftCardBalance = true, // Allow opt-out of gift card usage
    } = body;

    const adminSupabase = createAdminClient();
    const customerIdColumn = await getStripeCustomerIdColumn();

    // Kiosk mode: use provided customer_id
    if (customer_id) {
      logger.info({ customerId: customer_id }, '🛒 Kiosk mode checkout initiated');

      // Get customer profile from database
      const { data: profile, error: profileError } = await adminSupabase
        .from('users')
        .select('*')
        .eq('id', customer_id)
        .single();

      if (profileError || !profile) {
        logger.error({ error: profileError, customerId: customer_id }, 'Customer not found for kiosk checkout');
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      const totalAmount = product_price * (quantity || 1);
      const stripeCustomerId = profile[customerIdColumn];

      // Create checkout session for kiosk mode
      const session = await createCheckoutSession({
        customerId: customer_id,
        customerEmail: customer_email || profile.email,
        customerName: customer_name || profile.name,
        customerPhone: profile.phone,
        stripeCustomerId: stripeCustomerId || undefined,
        savePaymentMethod: true,
        lineItems: [{
          price: totalAmount,
          quantity: 1,
          name: product_name,
          description: product_description || '',
        }],
        metadata: {
          purchase_type: purchase_type,
          product_id: product_id,
          child_id: child_id || null,
          original_amount: totalAmount.toString(),
          gift_card_amount: '0',
          kiosk_mode: 'true',
          ...metadata,
        },
        successUrl: success_url || `${process.env.NEXT_PUBLIC_SITE_URL}/pos/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: cancel_url || `${process.env.NEXT_PUBLIC_SITE_URL}/pos`,
      });

      logger.info({ sessionId: session.id, customerId: customer_id }, '✅ Kiosk checkout session created');

      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
        originalAmount: totalAmount,
        chargeAmount: totalAmount,
      }, { status: 200 });
    }

    // Authenticated mode: require logged in user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!productId || !productName || productPrice === undefined || !purchaseType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const totalAmount = productPrice * quantity;
    let amountToCharge = totalAmount;
    let giftCardAmountUsed = 0;

    // Check and apply gift card balance if enabled
    if (useGiftCardBalance) {
      const giftCardBalance = await getUserGiftCardBalance(user.id);

      if (giftCardBalance > 0) {
        // Calculate how much gift card balance to use
        giftCardAmountUsed = Math.min(giftCardBalance, totalAmount);
        amountToCharge = totalAmount - giftCardAmountUsed;

        logger.info(
          { userId: user.id, totalAmount, giftCardBalance, giftCardAmountUsed, amountToCharge },
          '💳 Gift card balance will be applied at checkout'
        );
      }
    }

    // If gift card covers entire purchase, create purchase directly without Stripe
    if (amountToCharge === 0) {
      logger.info(
        { userId: user.id, amount: totalAmount },
        '🎁 Purchase fully covered by gift card balance'
      );

      // Deduct from gift card balance
      await applyGiftCardBalance(user.id, giftCardAmountUsed);

      // Create purchase record directly
      const now = new Date();

      // Resolve purchase defaults from passes table (throws if pass not found)
      const { totalSessions, expiryDate } = await resolvePurchaseDefaults(
        productId,
        purchaseType,
        adminSupabase,
      );

      // A punch card is always account-scoped — derived from the product
      // itself (shared with /api/purchases/pos, /api/stripe/direct-payment,
      // /api/stripe/kiosk-payment and both webhook handlers), never from the
      // request. This branch writes the purchase row directly when gift card
      // credit covers the whole price, so it never reaches the webhook that
      // would otherwise have set the scope. Day and monthly passes resolve to
      // 'child', same as the column default; a failed lookup does too, so a
      // hiccup in the passes table cannot block the sale.
      const passScope = await resolvePassScope(productId, adminSupabase);

      const { data: purchase, error: purchaseError } = await adminSupabase
        .from('purchases')
        .insert({
          customer_id: user.id,
          // An account-wide card names no child — see the note in
          // /api/purchases/pos. A row that is account-scoped and child-tagged
          // is the contradiction the launch runbook asserts must not exist.
          child_id: passScope === 'account' ? null : (childId || null),
          type: purchaseType,
          product_id: productId,
          name: productName,
          price: totalAmount,
          purchase_date: now.toISOString(),
          expiry_date: expiryDate?.toISOString() || null,
          used_sessions: 0,
          total_sessions: totalSessions,
          status: 'active',
          stripe_payment_intent_id: `giftcard_${Date.now()}`, // Mark as gift card purchase
          gift_card_amount_used: giftCardAmountUsed,
          pass_scope: passScope,
        })
        .select()
        .single();

      if (purchaseError) {
        logger.error({ error: purchaseError }, 'Failed to create purchase from gift card');
        return NextResponse.json(
          { error: 'Failed to complete purchase' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        purchaseId: purchase.id,
        giftCardUsed: giftCardAmountUsed,
        message: `Purchase completed using $${giftCardAmountUsed.toFixed(2)} gift card balance!`,
        redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/customer/purchases`,
      }, { status: 200 });
    }

    // Use the mode-aware customer ID column (already fetched at top)
    const stripeCustomerId = profile[customerIdColumn];

    // Create checkout session for remaining amount
    const session = await createCheckoutSession({
      customerId: user.id,
      customerEmail: profile.email || user.email!,
      customerName: profile.name,
      customerPhone: profile.phone,
      stripeCustomerId: stripeCustomerId || undefined,
      savePaymentMethod: true,
      lineItems: [{
        price: amountToCharge,
        quantity: 1, // Already calculated total
        name: giftCardAmountUsed > 0
          ? `${productName} (after $${giftCardAmountUsed.toFixed(2)} gift card credit)`
          : productName,
        description: productDescription,
      }],
      metadata: {
        purchase_type: purchaseType,
        product_id: productId,
        child_id: childId,
        original_amount: totalAmount.toString(),
        gift_card_amount: giftCardAmountUsed.toString(),
        ...metadata,
      },
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/customer/purchases?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/customer/passes`,
    });

    // If gift card was used, deduct it now (we'll refund if checkout is cancelled)
    if (giftCardAmountUsed > 0) {
      await applyGiftCardBalance(user.id, giftCardAmountUsed);
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      giftCardUsed: giftCardAmountUsed,
      originalAmount: totalAmount,
      chargeAmount: amountToCharge,
    }, { status: 200 });

  } catch (error) {
    logger.error({ error }, 'Checkout error');
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
