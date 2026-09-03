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
 * - 'complimentary': Free pass (e.g., raffle donations) - no Stripe, $0 price
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import { getStripeClient, getStripeCustomerIdColumn, getStripeMode } from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/payment-methods';
import { logger } from '@/lib/logger';
import { validateBirthdateForProduct, hasAgeRestriction } from '@/lib/utils/ageUtils';
import { resolvePurchaseDefaults, checkDuplicateMonthlyPass, resolvePassScope } from '@/lib/utils/purchaseDefaults';
import { decrementInventoryAfterPurchase } from '@/lib/services/products';
import { validateCoupon, redeemCoupon, computeCouponDiscount } from '@/lib/services/coupons';
import { getUserGiftCardBalance, applyGiftCardBalance } from '@/lib/services/gift-cards';
import {
  MEMBERSHIP_DISCOUNT_PERCENT,
  applyMemberDiscount,
  fromPurchaseRow,
  hasActiveMembership,
  isMemberDiscountable,
} from '@/lib/membership';

type PaymentMethod = 'terminal' | 'saved_card' | 'test' | 'cash' | 'complimentary';

// The exact row shape `.insert(...).select().single()` resolves to for this
// table — used to type the per-child purchases returned to the caller so
// Task 8 can open each child's session against their own new pass.
type PurchaseRow = Database['public']['Tables']['purchases']['Row'];

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
      children_ids, // For family passes: array of child IDs
      split_per_child, // Record one purchase row per child in children_ids (day passes bought for siblings)
      child_prices, // Optional exact price per child, aligned with children_ids; must sum to product_price
      pass_scope,
      quantity = 1,
      metadata = {},
      // Payment method options
      payment_method = 'test' as PaymentMethod,
      payment_method_id, // For saved_card
      terminal_payment_intent_id, // For terminal (already confirmed via Terminal SDK)
      coupon_code, // Optional: single-use coupon code (day-pass purchases only)
      use_gift_card_balance = true, // Apply the customer's account gift card credit (default on)
    } = body;

    // Punch cards are bought for the account from 1 October 2026. Anything that
    // does not say so is a pass for one named child, which is what every row
    // sold before then is. This is provisional -- overridden below once the
    // product itself is resolved, because a punch card must always be
    // account-scoped no matter what (or whether) the caller sent pass_scope.
    let passScope: 'child' | 'account' = pass_scope === 'account' ? 'account' : 'child';

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

    // Prevent duplicate monthly passes per child
    if (child_id) {
      const duplicateError = await checkDuplicateMonthlyPass(child_id, purchase_type, adminSupabase);
      if (duplicateError) {
        return NextResponse.json({ error: duplicateError }, { status: 400 });
      }
    }

    logger.info({ customer_id, product_name, purchase_type, payment_method }, 'Processing POS purchase');

    // Active members get an automatic discount on food & retail. Resolved here,
    // server-side, from the customer's own purchase history — the client sends
    // the list price and never decides whether the discount applies.
    let memberDiscount = 0;
    let unitPrice = Number(product_price);
    if (isMemberDiscountable(purchase_type)) {
      const { data: memberPasses, error: memberError } = await adminSupabase
        .from('purchases')
        .select('type, status, expiry_date, actual_expiry_date')
        .eq('customer_id', customer_id)
        .eq('type', 'monthly_pass')
        .eq('status', 'active');

      if (memberError) {
        // Never block a sale on this — the customer just pays list price.
        logger.warn(
          { customer_id, error: memberError },
          'Failed to check membership for counter discount, charging list price'
        );
      } else if (hasActiveMembership((memberPasses ?? []).map(fromPurchaseRow))) {
        unitPrice = applyMemberDiscount(unitPrice, true);
        memberDiscount = Number(product_price) - unitPrice;
        logger.info(
          { customer_id, product_name, memberDiscount, percent: MEMBERSHIP_DISCOUNT_PERCENT },
          '🏷️ Active member — applied automatic counter discount'
        );
      }
    }

    // Coupon validation (day-pass only; single-use; cap at one unit's price; remainder forfeited)
    let couponDiscount = 0;
    let validatedCouponId: string | null = null;
    if (coupon_code) {
      if (purchase_type !== 'day_pass' || /punch/i.test(product_name)) {
        return NextResponse.json(
          { error: 'Coupon codes can only be applied to day pass purchases' },
          { status: 400 }
        );
      }
      if (payment_method === 'terminal') {
        // Terminal payment intent's amount is locked at creation time on the
        // client; coupon-discounted prices need to be processed via cash or
        // saved_card so the charge reflects the discounted total.
        return NextResponse.json(
          { error: 'Terminal payment is not supported with coupon codes — use cash or saved card' },
          { status: 400 }
        );
      }
      const couponResult = await validateCoupon(coupon_code);
      if (!couponResult.valid || !couponResult.coupon) {
        return NextResponse.json(
          { error: couponResult.error || 'Invalid coupon code' },
          { status: 400 }
        );
      }
      const { applied } = computeCouponDiscount(couponResult.coupon, unitPrice);
      couponDiscount = applied;
      validatedCouponId = couponResult.coupon.id;
    }

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
    const finalUnitPrice = Math.max(0, unitPrice - couponDiscount);
    const finalTotal = finalUnitPrice * quantity;

    // Apply the customer's gift card balance (account credit) to the remaining total,
    // after any coupon. Mirrors the kiosk and web checkout flows so a staff-rung purchase
    // honors the customer's credit. Not applied to complimentary (free) passes.
    let giftCardAmountUsed = 0;
    if (use_gift_card_balance && payment_method !== 'complimentary' && finalTotal > 0) {
      const giftCardBalance = await getUserGiftCardBalance(customer_id);
      if (giftCardBalance > 0) {
        if (payment_method === 'terminal') {
          // The Terminal PaymentIntent amount is locked at creation time on the client
          // (same constraint as coupons), so credit can't be applied to the charge after
          // the fact. Steer staff to cash or saved card so the charge reflects the credit.
          return NextResponse.json(
            { error: 'Gift card credit cannot be applied to a terminal payment — use cash or saved card to apply the customer\'s balance' },
            { status: 400 }
          );
        }
        giftCardAmountUsed = Math.min(giftCardBalance, finalTotal);
        logger.info(
          { customer_id, finalTotal, giftCardBalance, giftCardAmountUsed },
          '🎁 Applying gift card credit to POS purchase'
        );
      }
    }

    const amountToCharge = finalTotal - giftCardAmountUsed;
    const amountInCents = Math.round(amountToCharge * 100);
    const couponCoversFull = coupon_code != null && finalTotal === 0;
    // Gift card credit (after any coupon) covers the whole remaining total
    const creditCoversFull = giftCardAmountUsed > 0 && amountToCharge === 0;

    let paymentIntentId: string | null = null;
    let paymentStatus: string = 'succeeded';

    // Handle different payment methods
    if (couponCoversFull || creditCoversFull) {
      // Coupon and/or gift card credit fully covers price — skip Stripe (mirrors complimentary path)
      paymentIntentId = null;
      paymentStatus = couponCoversFull ? 'coupon_full_redeem' : 'gift_card_full_redeem';
      logger.info(
        { customer_id, product_name, giftCardAmountUsed },
        '🎟️ Coupon/gift card credit fully covered purchase — Stripe skipped'
      );
    } else if (payment_method === 'terminal') {
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
          gift_card_amount: giftCardAmountUsed.toString(),
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

    } else if (payment_method === 'complimentary') {
      // Complimentary pass - no Stripe, $0 price
      paymentIntentId = null;
      paymentStatus = 'complimentary';

      logger.info({ customer_id, product_name }, '🎁 Complimentary pass issued');

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
          gift_card_amount: giftCardAmountUsed.toString(),
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

    // Resolve purchase defaults from passes table (throws if pass not found)
    const now = new Date();
    const { totalSessions, expiryDate } = await resolvePurchaseDefaults(
      product_id,
      purchase_type,
      adminSupabase,
    );

    // A punch card is always account-scoped, regardless of what pass_scope the
    // caller sent (or, from a screen that predates this, never sends at all).
    // Several screens post here — the POS product grid, the customer
    // dashboard's own purchase flow, and this route's own card-first punch
    // flow — and a client-supplied scope on a money-bearing column is the
    // wrong shape: any future caller that forgets to send pass_scope: 'account'
    // would silently create a card that only works for one child. Deriving it
    // from the product itself (shared with /api/stripe/direct-payment and the
    // Stripe webhook, so all three callers agree) makes forgetting impossible.
    // Day and monthly passes are untouched: they stay whatever passScope
    // already resolved to above.
    if ((await resolvePassScope(product_id, adminSupabase)) === 'account') {
      passScope = 'account';
    }

    // Monthly passes default to auto-renew on (renew 7 days before expiry)
    const isMonthlyPass = purchase_type === 'monthly_pass';
    const nextRenewalDate = isMonthlyPass && expiryDate
      ? new Date(expiryDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Child + Infant combo pass: create individual purchases per child
    const isComboPass = (product_name.toLowerCase().includes('child') || product_name.toLowerCase().includes('toddler')) && product_name.toLowerCase().includes('infant');
    const comboChildrenIds = isComboPass && Array.isArray(children_ids) && children_ids.length === 2
      ? children_ids
      : null;

    // One payment covering several children records a purchase row per child, so
    // every child's pass is tracked and priced on its own. The combo pass has
    // always worked this way; the child-first flow asks for it explicitly via
    // split_per_child so that family passes — which are one pass covering many
    // children — keep recording as a single row.
    const requestedSplitIds = split_per_child === true && Array.isArray(children_ids) && children_ids.length > 0
      ? (children_ids as string[])
      : null;
    const splitChildrenIds = requestedSplitIds ?? comboChildrenIds;

    // Exact per-child prices, when the caller sends them. They must add up to
    // the amount actually charged, otherwise the recorded revenue would drift
    // from the payment — fall back to an even split rather than trust them.
    let perChildPrices: number[] | null = null;
    if (splitChildrenIds && Array.isArray(child_prices) && child_prices.length === splitChildrenIds.length) {
      const sum = child_prices.reduce((t: number, p: number) => t + Number(p), 0);
      if (Math.abs(sum - Number(product_price)) < 0.01) {
        perChildPrices = child_prices.map((p: number) => Number(p));
      } else {
        logger.warn(
          { customer_id, sum, product_price },
          'child_prices do not sum to product_price — falling back to an even split'
        );
      }
    }

    let purchase;
    // Every row created by this request, in addition to `purchase` above.
    // Task 8 needs each child's own new pass id to open that child's session,
    // which `purchase` alone (the split branch's "use first for the response")
    // cannot provide.
    let createdPurchases: PurchaseRow[] = [];

    if (splitChildrenIds) {
      // Create a separate purchase for each child sharing this payment
      const evenPrice = (payment_method === 'complimentary' ? 0 : Number(product_price)) / splitChildrenIds.length;
      const giftCardPerChild = giftCardAmountUsed / splitChildrenIds.length;
      const purchases: PurchaseRow[] = [];

      for (const [index, comboChildId] of splitChildrenIds.entries()) {
        const pricePerChild = payment_method === 'complimentary'
          ? 0
          : (perChildPrices ? perChildPrices[index] : evenPrice);

        const { data: childPurchase, error: childDbError } = await adminSupabase
          .from('purchases')
          .insert({
            customer_id,
            child_id: comboChildId,
            type: purchase_type,
            product_id,
            name: product_name,
            price: pricePerChild,
            purchase_date: now.toISOString(),
            expiry_date: expiryDate?.toISOString() || null,
            used_sessions: 0,
            total_sessions: 1,
            status: 'active',
            stripe_payment_intent_id: paymentIntentId,
            gift_card_amount_used: giftCardPerChild,
          })
          .select()
          .single();

        if (childDbError) {
          logger.error({ error: childDbError, customer_id, comboChildId }, 'Failed to save combo purchase');
          throw childDbError;
        }

        purchases.push(childPurchase!);
      }

      purchase = purchases[0]; // Use first for the response
      createdPurchases = purchases;
      logger.info(
        { purchaseIds: purchases.map(p => p.id), customer_id, exactPrices: perChildPrices !== null },
        'Multi-child pass: created individual purchases for each child'
      );
    } else {
      // Standard single purchase
      const { data: singlePurchase, error: dbError } = await adminSupabase
        .from('purchases')
        .insert({
          customer_id,
          child_id: child_id || null,
          type: purchase_type,
          product_id,
          name: product_name,
          price: payment_method === 'complimentary' ? 0 : finalTotal,
          purchase_date: now.toISOString(),
          expiry_date: expiryDate?.toISOString() || null,
          used_sessions: 0,
          total_sessions: totalSessions,
          status: purchase_type === 'food_beverage' ? 'used' : 'active',
          stripe_payment_intent_id: paymentIntentId,
          gift_card_amount_used: giftCardAmountUsed,
          auto_renew: isMonthlyPass,
          next_renewal_date: nextRenewalDate,
          party_date: metadata.party_date || null,
          party_start_time: metadata.party_time || null,
          party_guests: metadata.party_guests ? parseInt(metadata.party_guests) : null,
          party_notes: metadata.party_notes || null,
          pass_scope: passScope,
        })
        .select()
        .single();

      if (dbError) {
        logger.error({ error: dbError, customer_id }, 'Failed to save purchase to database');
        throw dbError;
      }

      purchase = singlePurchase;
      createdPurchases = [singlePurchase!];

      // Atomically redeem the coupon against this purchase
      if (validatedCouponId && coupon_code) {
        const redeemResult = await redeemCoupon(coupon_code, customer_id, purchase.id, Number(product_price));
        if (!redeemResult.success) {
          // Race-loss (concurrent redemption). Purchase already happened at the
          // discounted price — log so this can be reconciled, but don't fail the request.
          logger.error(
            { couponCode: coupon_code, purchaseId: purchase.id, error: redeemResult.error },
            '⚠️ Coupon redemption failed after purchase succeeded — manual reconciliation needed'
          );
        }
      }

      // For family passes, link all selected children via purchase_children table
      if (Array.isArray(children_ids) && children_ids.length > 0) {
        const purchaseChildrenRows = children_ids.map((cid: string) => ({
          purchase_id: purchase.id,
          child_id: cid,
        }));

        const { error: pcError } = await adminSupabase
          .from('purchase_children')
          .insert(purchaseChildrenRows);

        if (pcError) {
          logger.error({ error: pcError, purchaseId: purchase.id }, 'Failed to link children to family pass');
        } else {
          logger.info(
            { purchaseId: purchase.id, childCount: children_ids.length },
            'Family pass children linked successfully'
          );
        }
      }
    }

    // Deduct the applied gift card credit from the customer's balance now that the
    // purchase record(s) exist. Logged for manual reconciliation on failure, mirroring
    // the coupon redemption ordering above (purchase is the source of truth).
    if (giftCardAmountUsed > 0) {
      try {
        await applyGiftCardBalance(customer_id, giftCardAmountUsed, purchase.id);
      } catch (giftCardError) {
        logger.error(
          { customer_id, giftCardAmountUsed, purchaseId: purchase.id, error: giftCardError },
          '⚠️ Gift card balance deduction failed after POS purchase succeeded — manual reconciliation needed'
        );
      }
    }

    // Decrement inventory for food/beverage purchases
    await decrementInventoryAfterPurchase(adminSupabase, product_id, product_name, quantity, purchase_type);

    logger.info(
      { purchaseId: purchase.id, customer_id, payment_method, giftCardAmountUsed },
      'Purchase saved successfully'
    );

    return NextResponse.json({
      success: true,
      purchase,
      purchases: createdPurchases,
      payment_intent_id: paymentIntentId,
      payment_status: paymentStatus,
      payment_method,
      gift_card_amount_used: giftCardAmountUsed,
      amount_charged: amountToCharge,
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

