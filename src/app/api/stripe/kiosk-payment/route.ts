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
import { resolvePurchaseDefaults, checkDuplicateMonthlyPass } from "@/lib/utils/purchaseDefaults";
import { decrementInventoryAfterPurchase } from "@/lib/services/products";

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
        // productPrice already includes quantity × discount from frontend
        const amountInCents = Math.round(productPrice * 100);

        // Create and confirm payment intent with saved card
        let paymentIntent;
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
        if (paymentIntent.status !== "succeeded") {
            logger.warn(
                { ...logContext, status: paymentIntent.status },
                "Payment not completed"
            );
            return NextResponse.json(
                { error: `Payment not completed. Status: ${paymentIntent.status}` },
                { status: 400 }
            );
        }

        logger.info(
            { ...logContext, paymentIntentId: paymentIntent.id },
            "💳 Kiosk payment succeeded"
        );

        // Resolve purchase defaults from passes table (throws if pass not found)
        const now = new Date();
        const defaults = await resolvePurchaseDefaults(
            productId,
            purchaseType,
            adminSupabase,
        );
        const expiryDate = defaults.expiryDate;

        // Child + Infant combo pass: create individual purchases per child
        const isComboPass = (productName.toLowerCase().includes('child') || productName.toLowerCase().includes('toddler')) && productName.toLowerCase().includes('infant');
        const comboChildrenIds = isComboPass && Array.isArray(childrenIds) && childrenIds.length === 2
            ? childrenIds
            : null;

        let purchase;

        if (comboChildrenIds) {
            // Create a separate purchase for each child in the combo
            const pricePerChild = productPrice / comboChildrenIds.length;
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
                        stripe_payment_intent_id: paymentIntent.id,
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
                    child_id: childId || null,
                    type: purchaseType,
                    product_id: productId,
                    name: purchaseName,
                    price: productPrice,
                    purchase_date: now.toISOString(),
                    expiry_date: expiryDate?.toISOString() || null,
                    used_sessions: 0,
                    total_sessions: totalSessions,
                    status: purchaseType === "food_beverage" ? "used" : "active",
                    stripe_payment_intent_id: paymentIntent.id,
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
                    extra: { customerId, paymentIntentId: paymentIntent.id },
                });

                return NextResponse.json(
                    {
                        error: "Payment processed but failed to create record. Please contact staff.",
                        paymentIntentId: paymentIntent.id,
                    },
                    { status: 500 }
                );
            }

            purchase = singlePurchase;

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

        // Decrement inventory for food/beverage purchases
        await decrementInventoryAfterPurchase(adminSupabase, productId, productName, quantity, purchaseType);

        logger.info(
            {
                ...logContext,
                purchaseId: purchase.id,
                paymentIntentId: paymentIntent.id,
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
            payment: {
                id: paymentIntent.id,
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
