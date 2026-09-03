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

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getStripeClient, getStripeCustomerIdColumn, getStripeMode } from "@/lib/stripe/client";
import { getOrCreateStripeCustomer } from "@/lib/stripe/payment-methods";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { validateBirthdateForProduct, hasAgeRestriction } from "@/lib/utils/ageUtils";
import { resolvePurchaseDefaults, checkDuplicateMonthlyPass, resolvePassScope } from "@/lib/utils/purchaseDefaults";
import { decrementInventoryAfterPurchase } from "@/lib/services/products";
import { validateCoupon, redeemCoupon, computeCouponDiscount } from "@/lib/services/coupons";
import { getUserGiftCardBalance, applyGiftCardBalance } from "@/lib/services/gift-cards";
import {
    MEMBERSHIP_DISCOUNT_PERCENT,
    applyMemberDiscount,
    fromPurchaseRow,
    hasActiveMembership,
    isMemberDiscountable,
} from "@/lib/membership";

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
            childrenIds, // For family passes: array of child IDs
            quantity = 1,
            paymentMethodId,
            metadata = {},
            couponCode, // Optional: single-use coupon code (day-pass purchases only)
            useGiftCardBalance = true, // Apply the customer's account gift card credit (default on)
        } = body;

        // Validate required fields
        if (!customerId) {
            return NextResponse.json(
                {
                    error: "Customer ID required. Please identify yourself at the kiosk.",
                },
                { status: 400 }
            );
        }

        if (!productId || !productName || productPrice === undefined || !purchaseType) {
            return NextResponse.json(
                {
                    error: "Missing required fields: productId, productName, productPrice, purchaseType",
                },
                { status: 400 }
            );
        }

        if (!paymentMethodId) {
            return NextResponse.json(
                {
                    error: "Payment method required. Please add a payment method first.",
                },
                { status: 400 }
            );
        }

        const logContext = {
            customerId,
            productId,
            purchaseType,
            paymentMethodId: paymentMethodId.substring(0, 10) + "...",
            source: "kiosk",
        };

        logger.info(logContext, "🏪 Processing kiosk self-serve payment");

        // Get customer profile with both Stripe customer ID columns
        const customerIdColumn = await getStripeCustomerIdColumn();
        const { data: customer, error: customerError } = await adminSupabase
            .from("users")
            .select(
                "id, email, name, phone, stripe_customer_id_test, stripe_customer_id_live"
            )
            .eq("id", customerId)
            .single();

        if (customerError || !customer) {
            logger.error({ ...logContext, error: customerError }, "Customer not found");
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        // Verify the payment method belongs to this customer AND matches current Stripe mode
        const stripeMode = await getStripeMode();
        const { data: savedCard, error: cardError } = await adminSupabase
            .from("saved_cards")
            .select("*")
            .eq("customer_id", customerId)
            .eq("stripe_payment_method_id", paymentMethodId)
            .eq("stripe_mode", stripeMode)
            .single();

        if (cardError || !savedCard) {
            logger.warn({ ...logContext, stripeMode }, "Payment method not found for customer in current mode");
            return NextResponse.json(
                { error: "Invalid payment method. Please add a new card for this payment mode." },
                { status: 400 }
            );
        }

        // Age gate validation for passes with age restrictions
        if (childId && hasAgeRestriction(productName)) {
            const { data: child } = await adminSupabase
                .from("children")
                .select("birthdate, name")
                .eq("id", childId)
                .single();

            if (child?.birthdate) {
                const validation = validateBirthdateForProduct(child.birthdate, productName);
                if (!validation.valid) {
                    logger.warn(
                        { ...logContext, childId, childName: child.name, childAge: validation.childAge },
                        "❌ Age gate validation failed"
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

        // Get or create Stripe customer
        const existingStripeCustomerId =
            customerIdColumn === "stripe_customer_id_test"
                ? customer.stripe_customer_id_test
                : customer.stripe_customer_id_live;
        const stripeCustomerId =
            existingStripeCustomerId ||
            (await getOrCreateStripeCustomer(
                customer.id,
                customer.email || "",
                customer.name || "",
                customer.phone
            ));

        const stripe = await getStripeClient();

        // Active members get an automatic discount on food & retail. Resolved
        // server-side from the customer's own purchase history so the client
        // never decides whether the discount applies. Note productPrice here is
        // already the line total (quantity × any sibling discount).
        let memberDiscount = 0;
        let discountedTotal = Number(productPrice);
        if (isMemberDiscountable(purchaseType)) {
            const { data: memberPasses, error: memberError } = await adminSupabase
                .from("purchases")
                .select("type, status, expiry_date, actual_expiry_date")
                .eq("customer_id", customerId)
                .eq("type", "monthly_pass")
                .eq("status", "active");

            if (memberError) {
                // Never block a sale on this — the customer just pays list price.
                logger.warn(
                    { customerId, error: memberError },
                    "Failed to check membership for counter discount, charging list price"
                );
            } else if (hasActiveMembership((memberPasses ?? []).map(fromPurchaseRow))) {
                discountedTotal = applyMemberDiscount(discountedTotal, true);
                memberDiscount = Number(productPrice) - discountedTotal;
                logger.info(
                    { customerId, productName, memberDiscount, percent: MEMBERSHIP_DISCOUNT_PERCENT },
                    "🏷️ Active member — applied automatic counter discount"
                );
            }
        }

        // Coupon validation (day-pass only; single-use; cap at productPrice; remainder forfeited)
        let couponDiscount = 0;
        let validatedCouponId: string | null = null;
        if (couponCode) {
            if (purchaseType !== "day_pass" || /punch/i.test(productName)) {
                return NextResponse.json(
                    { error: "Coupon codes can only be applied to day pass purchases" },
                    { status: 400 }
                );
            }
            const couponResult = await validateCoupon(couponCode);
            if (!couponResult.valid || !couponResult.coupon) {
                return NextResponse.json(
                    { error: couponResult.error || "Invalid coupon code" },
                    { status: 400 }
                );
            }
            const { applied } = computeCouponDiscount(couponResult.coupon, discountedTotal);
            couponDiscount = applied;
            validatedCouponId = couponResult.coupon.id;
        }

        // productPrice already includes quantity × discount from frontend
        const finalTotal = Math.max(0, discountedTotal - couponDiscount);

        // Apply the customer's gift card balance (account credit) to the remaining
        // total, after any coupon. Mirrors the web and After Dark checkout flows so a
        // customer's credit is honored at the kiosk instead of being silently skipped.
        let giftCardAmountUsed = 0;
        if (useGiftCardBalance && finalTotal > 0) {
            const giftCardBalance = await getUserGiftCardBalance(customerId);
            if (giftCardBalance > 0) {
                giftCardAmountUsed = Math.min(giftCardBalance, finalTotal);
                logger.info(
                    { ...logContext, finalTotal, giftCardBalance, giftCardAmountUsed },
                    "🎁 Applying gift card credit to kiosk purchase"
                );
            }
        }

        const amountToCharge = Math.max(0, finalTotal - giftCardAmountUsed);
        const amountInCents = Math.round(amountToCharge * 100);
        // Skip the card charge when coupon + gift card credit cover the full total
        const skipCardCharge = amountToCharge === 0;

        // Create and confirm payment intent with saved card (skipped if fully covered)
        let paymentIntent: { id: string; status: string } | null = null;
        if (!skipCardCharge) {
        try {
            // Build description with quantity
            const paymentDescription =
                quantity > 1
                    ? `${quantity}x ${productName}`
                    : productDescription || productName;

            paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: "usd",
                customer: stripeCustomerId,
                payment_method: paymentMethodId,
                description: paymentDescription,
                metadata: {
                    customer_id: customerId,
                    product_id: productId,
                    purchase_type: purchaseType,
                    child_id: childId || "",
                    product_name: productName,
                    quantity: quantity.toString(),
                    kiosk_transaction: "true",
                    gift_card_amount: giftCardAmountUsed.toString(),
                    ...metadata,
                },
                confirm: true,
                off_session: true,
            });
        } catch (stripeError) {
            const error = stripeError as { code?: string; message?: string };
            logger.error(
                { ...logContext, stripeError: error.message },
                "❌ Stripe payment failed"
            );

            // Handle specific Stripe errors
            if (error.code === "authentication_required") {
                return NextResponse.json(
                    {
                        error: "This card requires additional verification. Please use a different card.",
                        requires_action: true,
                    },
                    { status: 400 }
                );
            }

            if (error.code === "card_declined") {
                return NextResponse.json(
                    { error: "Card declined. Please try a different card." },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                {
                    error:
                        error.message || "Payment processing failed. Please try again.",
                },
                { status: 400 }
            );
        }

        // Verify payment succeeded
        if (!paymentIntent || paymentIntent.status !== "succeeded") {
            logger.warn(
                { ...logContext, status: paymentIntent?.status },
                "Payment not completed"
            );
            return NextResponse.json(
                { error: `Payment not completed. Status: ${paymentIntent?.status}` },
                { status: 400 }
            );
        }

        logger.info(
            { ...logContext, paymentIntentId: paymentIntent.id },
            "💳 Kiosk payment succeeded"
        );
        } else {
            logger.info(
                { ...logContext, giftCardAmountUsed },
                "🎟️ Coupon/gift card credit fully covered kiosk purchase — Stripe skipped"
            );
        }

        // Resolve purchase defaults from passes table (throws if pass not found)
        const now = new Date();
        const defaults = await resolvePurchaseDefaults(
            productId,
            purchaseType,
            adminSupabase,
        );
        const expiryDate = defaults.expiryDate;

        // A punch card is always account-scoped — derived from the product
        // itself (shared with /api/purchases/pos, /api/stripe/direct-payment
        // and both webhook handlers), never from the request. This route is
        // the one the POS product grid uses in kiosk mode, so without this a
        // punch card bought from the grid looks normal and is silently locked
        // to one child. Day and monthly passes resolve to 'child', same as the
        // column default; a failed lookup does too, so a hiccup in the passes
        // table cannot block the sale.
        const passScope = await resolvePassScope(productId, adminSupabase);

        // Child + Infant combo pass: create individual purchases per child
        const isComboPass = (productName.toLowerCase().includes('child') || productName.toLowerCase().includes('toddler')) && productName.toLowerCase().includes('infant');
        const comboChildrenIds = isComboPass && Array.isArray(childrenIds) && childrenIds.length === 2
            ? childrenIds
            : null;

        let purchase;

        if (comboChildrenIds) {
            // Create a separate purchase for each child in the combo
            const pricePerChild = finalTotal / comboChildrenIds.length;
            const giftCardPerChild = giftCardAmountUsed / comboChildrenIds.length;
            const purchases = [];

            for (const comboChildId of comboChildrenIds) {
                const { data: childPurchase, error: childDbError } = await adminSupabase
                    .from("purchases")
                    .insert({
                        customer_id: customerId,
                        child_id: comboChildId,
                        type: purchaseType,
                        product_id: productId,
                        name: productName,
                        price: pricePerChild,
                        purchase_date: now.toISOString(),
                        expiry_date: expiryDate?.toISOString() || null,
                        used_sessions: 0,
                        total_sessions: 1,
                        status: "active",
                        // One row per named child in a combo is a per-child
                        // pass by construction. Explicit, so every insert in
                        // this route states its scope.
                        pass_scope: "child" as const,
                        stripe_payment_intent_id: paymentIntent?.id || null,
                        gift_card_amount_used: giftCardPerChild,
                    })
                    .select()
                    .single();

                if (childDbError) {
                    logger.error({ error: childDbError, customerId, comboChildId }, "Failed to save combo purchase");
                    throw childDbError;
                }

                purchases.push(childPurchase);
            }

            purchase = purchases[0];
            logger.info(
                { purchaseIds: purchases.map(p => p.id), customerId },
                "Combo pass: created individual purchases for each child"
            );
        } else {
            // Standard single purchase
            // Calculate total sessions (multiply by quantity for stackable passes)
            const sessionsPerUnit = defaults.totalSessions;
            const isUnlimited = sessionsPerUnit === 999;
            const totalSessions = isUnlimited
                ? 999 // Unlimited doesn't multiply
                : sessionsPerUnit * quantity;

            // Build product name with quantity
            const purchaseName = quantity > 1 ? `${quantity}x ${productName}` : productName;

            // Create purchase record (matching POS endpoint structure)
            const { data: singlePurchase, error: purchaseError } = await adminSupabase
                .from("purchases")
                .insert({
                    customer_id: customerId,
                    // An account-wide card names no child — see the note in
                    // /api/purchases/pos. A row that is account-scoped and
                    // child-tagged is the contradiction the launch runbook
                    // asserts must not exist.
                    child_id: passScope === "account" ? null : (childId || null),
                    type: purchaseType,
                    product_id: productId,
                    name: purchaseName,
                    price: finalTotal,
                    purchase_date: now.toISOString(),
                    expiry_date: expiryDate?.toISOString() || null,
                    used_sessions: 0,
                    total_sessions: totalSessions,
                    status: purchaseType === "food_beverage" ? "used" : "active",
                    stripe_payment_intent_id: paymentIntent?.id || null,
                    gift_card_amount_used: giftCardAmountUsed,
                    pass_scope: passScope,
                })
                .select()
                .single();

            if (purchaseError) {
                logger.error(
                    { ...logContext, error: purchaseError },
                    "❌ Failed to create purchase record"
                );
                Sentry.captureException(purchaseError, {
                    tags: { component: "kiosk-payment", action: "create_purchase" },
                    extra: { customerId, paymentIntentId: paymentIntent?.id },
                });

                return NextResponse.json(
                    {
                        error: "Payment processed but failed to create record. Please contact staff.",
                        paymentIntentId: paymentIntent?.id,
                    },
                    { status: 500 }
                );
            }

            purchase = singlePurchase;

            // Atomically redeem the coupon against this purchase
            if (validatedCouponId && couponCode) {
                const redeemResult = await redeemCoupon(couponCode, customerId, purchase.id, Number(productPrice));
                if (!redeemResult.success) {
                    logger.error(
                        { couponCode, purchaseId: purchase.id, error: redeemResult.error },
                        "⚠️ Coupon redemption failed after kiosk purchase succeeded — manual reconciliation needed"
                    );
                }
            }

            // For family passes, link all selected children via purchase_children table
            if (Array.isArray(childrenIds) && childrenIds.length > 0) {
                const purchaseChildrenRows = childrenIds.map((cid: string) => ({
                    purchase_id: purchase.id,
                    child_id: cid,
                }));

                const { error: pcError } = await adminSupabase
                    .from("purchase_children")
                    .insert(purchaseChildrenRows);

                if (pcError) {
                    logger.error({ error: pcError, purchaseId: purchase.id }, "Failed to link children to family pass");
                } else {
                    logger.info(
                        { purchaseId: purchase.id, childCount: childrenIds.length },
                        "Family pass children linked successfully"
                    );
                }
            }
        }

        // Deduct the applied gift card credit from the customer's balance now that the
        // purchase record(s) exist. Logged for manual reconciliation on failure, mirroring
        // the coupon redemption ordering above (purchase is the source of truth).
        if (giftCardAmountUsed > 0) {
            try {
                await applyGiftCardBalance(customerId, giftCardAmountUsed, purchase.id);
            } catch (giftCardError) {
                logger.error(
                    { ...logContext, giftCardAmountUsed, purchaseId: purchase.id, error: giftCardError },
                    "⚠️ Gift card balance deduction failed after kiosk purchase succeeded — manual reconciliation needed"
                );
                Sentry.captureException(giftCardError, {
                    tags: { component: "kiosk-payment", action: "apply_gift_card" },
                    extra: { customerId, purchaseId: purchase.id, giftCardAmountUsed },
                });
            }
        }

        // Decrement inventory for food/beverage purchases
        await decrementInventoryAfterPurchase(adminSupabase, productId, productName, quantity, purchaseType);

        logger.info(
            {
                ...logContext,
                purchaseId: purchase.id,
                paymentIntentId: paymentIntent?.id,
            },
            "✅ Kiosk purchase completed successfully"
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
            giftCardAmountUsed,
            amountCharged: amountToCharge,
            payment: {
                id: paymentIntent?.id || null,
                amount: amountInCents,
                cardLast4: savedCard.last4,
                cardBrand: savedCard.brand,
            },
        });
    } catch (error) {
        logger.error({ error }, "❌ Kiosk payment error");
        Sentry.captureException(error, {
            tags: { component: "kiosk-payment" },
        });

        return NextResponse.json(
            {
                error: "An unexpected error occurred. Please try again or contact staff.",
            },
            { status: 500 }
        );
    }
}
