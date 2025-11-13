/**
 * Stripe Webhook Handler
 * Handles Stripe webhook events and syncs data to Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// This is important for Next.js to treat this as raw body
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
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
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
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

  // Find and update/delete the purchase
  const { error } = await supabase
    .from('purchases')
    .update({
      status: 'expired',
    })
    .eq('stripe_payment_intent_id', charge.payment_intent as string);

  if (error) {
    console.error('Error handling refund:', error);
    throw error;
  }

  console.log('Purchase marked as refunded');
}

