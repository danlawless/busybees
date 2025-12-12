/**
 * Stripe Checkout API Route
 * Create checkout sessions for purchases with gift card balance support
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import { applyGiftCardBalance, getUserGiftCardBalance } from '@/lib/services/gift-cards';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const {
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
      const adminSupabase = createAdminClient();

      // Calculate expiry dates based on purchase type
      const now = new Date();
      let expiryDate = null;
      let totalSessions = 1;

      if (purchaseType === 'day_pass') {
        expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        totalSessions = 1;
      } else if (purchaseType === 'weekly_pass') {
        expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        totalSessions = 999;
      } else if (purchaseType === 'monthly_pass') {
        expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        totalSessions = 999;
      }

      const { data: purchase, error: purchaseError } = await adminSupabase
        .from('purchases')
        .insert({
          customer_id: user.id,
          child_id: childId || null,
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

    // Create checkout session for remaining amount
    const session = await createCheckoutSession({
      customerId: user.id,
      customerEmail: profile.email || user.email!,
      customerName: profile.name,
      customerPhone: profile.phone,
      stripeCustomerId: profile.stripe_customer_id || undefined,
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
