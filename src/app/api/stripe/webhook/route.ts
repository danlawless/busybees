/**
 * Stripe Webhook Handler
 * Handles Stripe webhook events and syncs data to Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/server';
import { subscribeToNewsletter } from '@/lib/services/newsletter';
import { createGiftCard, markGiftCardAsSent } from '@/lib/services/gift-cards';
import { sendGiftCardEmail } from '@/lib/email/resend';
import Stripe from 'stripe';

// This is important for Next.js to treat this as raw body
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  // Get webhook secret from database or env
  const supabase = createAdminClient();
  const { data: settingData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'stripe_webhook_secret')
    .single();

  const webhookSecret = settingData?.value || process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = await getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;

      case 'setup_intent.setup_failed':
        await handleSetupIntentFailed(event.data.object as Stripe.SetupIntent);
        break;

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);

  const supabase = createAdminClient();
  const metadata = session.metadata;

  if (!metadata) {
    console.log('Missing metadata in checkout session');
    return;
  }

  // Handle gift card purchase
  if (metadata.type === 'gift_card') {
    console.log('Processing gift card purchase');

    try {
      // Create the gift card
      const giftCard = await createGiftCard({
        amount: parseFloat(metadata.amount),
        purchaser_email: metadata.purchaser_email,
        purchaser_name: metadata.purchaser_name,
        recipient_email: metadata.recipient_email,
        recipient_name: metadata.recipient_name,
        personal_message: metadata.personal_message || undefined,
        delivery_method: metadata.delivery_method as 'email_recipient' | 'email_self',
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
      });

      console.log('Gift card created:', giftCard.id, giftCard.code);

      // Determine recipient email based on delivery method
      const deliveryEmail = metadata.delivery_method === 'email_self'
        ? metadata.purchaser_email
        : metadata.recipient_email;

      // Send gift card email
      const emailResult = await sendGiftCardEmail({
        to: deliveryEmail,
        giftCard: {
          code: giftCard.code,
          amount: giftCard.amount,
          recipientName: metadata.recipient_name,
          purchaserName: metadata.purchaser_name,
          personalMessage: metadata.personal_message || undefined,
        },
      });

      if (emailResult.success) {
        await markGiftCardAsSent(giftCard.id);
        console.log('🎁 Gift card email sent successfully to:', deliveryEmail);
      } else {
        console.error('Failed to send gift card email:', emailResult.error);
      }
    } catch (error) {
      console.error('Error processing gift card purchase:', error);
    }

    return;
  }

  const {
    customer_id,
    product_id,
    purchase_type,
    child_id,
    party_date,
    party_time,
    party_guests,
    party_notes,
    booking_id,
  } = metadata;

  // Handle party booking confirmation
  if (purchase_type === 'party_package' && booking_id) {
    console.log('Confirming party booking:', booking_id);

    // Get booking details for email
    const { data: booking } = await supabase
      .from('party_bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    // Update booking status
    const { error: updateError } = await supabase
      .from('party_bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Error confirming party booking:', updateError);
    } else {
      console.log('Party booking confirmed successfully:', booking_id);

      // Log email details (TODO: implement actual email sending)
      if (booking) {
        console.log('📧 Sending confirmation email to:', booking.customer_email);
        console.log('📧 Party details:', {
          childName: booking.child_name,
          date: booking.party_date,
          time: `${booking.start_time} - ${booking.end_time}`,
          package: booking.package_name,
          guests: booking.guest_count,
          total: booking.total_price,
        });
      }
    }

    return;
  }

  if (!customer_id || !product_id || !purchase_type) {
    console.log('Missing required metadata fields');
    return;
  }

  // Calculate expiry dates based on purchase type
  const now = new Date();
  let expiryDate = null;
  let totalSessions = 1;

  if (purchase_type === 'day_pass') {
    expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    totalSessions = 1;
  } else if (purchase_type === 'weekly_pass') {
    expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    totalSessions = 999; // Unlimited
  } else if (purchase_type === 'monthly_pass') {
    expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    totalSessions = 999; // Unlimited
  }

  // Create purchase record
  const { error } = await supabase.from('purchases').insert({
    customer_id,
    child_id: child_id || null,
    type: purchase_type,
    product_id,
    name: session.line_items?.data[0]?.description || 'Purchase',
    price: session.amount_total ? session.amount_total / 100 : 0,
    purchase_date: now.toISOString(),
    expiry_date: expiryDate?.toISOString() || null,
    used_sessions: 0,
    total_sessions: totalSessions,
    status: 'active',
    stripe_payment_intent_id: session.payment_intent as string,
    party_date: party_date || null,
    party_start_time: party_time || null,
    party_guests: party_guests ? parseInt(party_guests) : null,
    party_notes: party_notes || null,
  });

  if (error) {
    console.error('Error creating purchase:', error);
  } else {
    console.log('Purchase created successfully for customer:', customer_id);
  }

  // Auto-subscribe to newsletter for party bookings
  if (purchase_type === 'party_package' && session.customer_email) {
    await subscribeToNewsletter({
      email: session.customer_email,
      source: 'party_booking',
    });
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('PaymentIntent succeeded:', paymentIntent.id);

  const supabase = createAdminClient();

  // Extract metadata from payment intent
  const { customer, metadata } = paymentIntent;

  if (!customer || !metadata) {
    console.log('Missing customer or metadata in payment intent');
    return;
  }

  const {
    customer_id,
    product_id,
    product_type,
    product_name,
    child_id,
    total_sessions,
  } = metadata;

  if (!customer_id || !product_id || !product_type || !product_name) {
    console.log('Missing required metadata fields');
    return;
  }

  // Create purchase record
  const { error } = await supabase.from('purchases').insert({
    customer_id,
    child_id: child_id || null,
    type: product_type as any,
    product_id,
    name: product_name,
    price: paymentIntent.amount / 100, // Convert cents to dollars
    purchase_date: new Date().toISOString(),
    used_sessions: 0,
    total_sessions: parseInt(total_sessions || '1'),
    status: 'active',
    stripe_payment_intent_id: paymentIntent.id,
  });

  if (error) {
    console.error('Error creating purchase record:', error);
    throw error;
  }

  console.log('Purchase record created successfully');
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('PaymentIntent failed:', paymentIntent.id);
  // Log the failure for monitoring
  // Could send notification to admin
}

async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  console.log('SetupIntent succeeded:', setupIntent.id);

  const supabase = createAdminClient();

  // Get payment method and customer details
  const paymentMethodId = setupIntent.payment_method as string;
  const customerId = setupIntent.customer as string;

  if (!paymentMethodId || !customerId) {
    console.log('Missing payment method or customer in setup intent');
    return;
  }

  // Get the Stripe customer to find the linked user
  const stripe = await getStripeClient();
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    console.log('Customer has been deleted');
    return;
  }

  const userId = customer.metadata?.supabase_user_id;
  if (!userId) {
    console.log('No Supabase user ID in customer metadata');
    return;
  }

  // Get payment method details
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  const card = paymentMethod.card;

  if (!card) {
    console.log('Payment method is not a card');
    return;
  }

  // Check if this is the first/only payment method
  const { data: existingCards } = await supabase
    .from('saved_cards')
    .select('id')
    .eq('customer_id', userId);

  const isDefault = !existingCards || existingCards.length === 0;

  // If setting as default, unset other defaults first
  if (isDefault) {
    await supabase
      .from('saved_cards')
      .update({ is_default: false })
      .eq('customer_id', userId);
  }

  // Save payment method to database
  const { error } = await supabase.from('saved_cards').insert({
    customer_id: userId,
    stripe_payment_method_id: paymentMethodId,
    last4: card.last4,
    brand: card.brand,
    expiry_month: card.exp_month,
    expiry_year: card.exp_year,
    is_default: isDefault,
  });

  if (error) {
    console.error('Error saving payment method to database:', error);
  } else {
    console.log('Payment method saved successfully for user:', userId);
  }
}

async function handleSetupIntentFailed(setupIntent: Stripe.SetupIntent) {
  console.log('SetupIntent failed:', setupIntent.id);
  // Log the failure for monitoring
  // Could send notification to user
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  console.log('Payment method attached:', paymentMethod.id);
  // Payment method was attached to a customer
  // This is typically handled via setup_intent.succeeded
}

async function handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod) {
  console.log('Payment method detached:', paymentMethod.id);

  const supabase = createAdminClient();

  // Remove from database
  const { error } = await supabase
    .from('saved_cards')
    .delete()
    .eq('stripe_payment_method_id', paymentMethod.id);

  if (error) {
    console.error('Error removing payment method from database:', error);
  } else {
    console.log('Payment method removed from database');
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);

  const supabase = createAdminClient();

  // Get subscription metadata
  const { customer, metadata } = subscription;

  if (!customer || !metadata) {
    console.log('Missing customer or metadata in subscription');
    return;
  }

  const {
    customer_id,
    product_id,
    product_type,
    product_name,
    child_id,
    total_sessions,
  } = metadata;

  if (!customer_id || !product_id || !product_type || !product_name) {
    console.log('Missing required metadata fields');
    return;
  }

  // Calculate next renewal date
  const nextRenewalDate = new Date(subscription.current_period_end * 1000).toISOString();

  // Create purchase record for subscription
  const { error } = await supabase.from('purchases').insert({
    customer_id,
    child_id: child_id || null,
    type: product_type as any,
    product_id,
    name: product_name,
    price: (subscription.items.data[0]?.price.unit_amount || 0) / 100,
    purchase_date: new Date().toISOString(),
    used_sessions: 0,
    total_sessions: parseInt(total_sessions || '999'),
    status: 'active',
    auto_renew: true,
    next_renewal_date: nextRenewalDate,
    stripe_subscription_id: subscription.id,
  });

  if (error) {
    console.error('Error creating subscription purchase record:', error);
    throw error;
  }

  console.log('Subscription purchase record created successfully');
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);

  const supabase = createAdminClient();

  // Update purchase record
  const nextRenewalDate = new Date(subscription.current_period_end * 1000).toISOString();

  const { error } = await supabase
    .from('purchases')
    .update({
      next_renewal_date: nextRenewalDate,
      status: subscription.status === 'active' ? 'active' : 'expired',
      auto_renew: !subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription purchase record:', error);
    throw error;
  }

  console.log('Subscription purchase record updated successfully');
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);

  const supabase = createAdminClient();

  // Mark purchase as expired
  const { error } = await supabase
    .from('purchases')
    .update({
      status: 'expired',
      auto_renew: false,
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error marking subscription as expired:', error);
    throw error;
  }

  console.log('Subscription marked as expired successfully');
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);

  // For recurring subscription payments
  if (invoice.subscription) {
    const supabase = createAdminClient();

    // Reset session count for monthly/weekly passes
    const { error } = await supabase
      .from('purchases')
      .update({
        used_sessions: 0,
        purchase_date: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', invoice.subscription);

    if (error) {
      console.error('Error resetting session count:', error);
      throw error;
    }

    console.log('Session count reset for recurring payment');
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('Charge refunded:', charge.id);

  const supabase = createAdminClient();

  // Find and update the purchase to refunded status
  const { error } = await supabase
    .from('purchases')
    .update({
      status: 'refunded',
    })
    .eq('stripe_payment_intent_id', charge.payment_intent as string);

  if (error) {
    console.error('Error handling refund:', error);
    throw error;
  }

  console.log('Purchase marked as refunded');
}
