/**
 * Stripe Terminal Payment API
 * Create and process payments via Terminal
 *
 * POST /api/stripe/terminal/payment - Create a Terminal PaymentIntent
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripeCustomerIdColumn } from '@/lib/stripe/client';
import { getOrCreateStripeCustomer } from '@/lib/stripe/payment-methods';
import { createTerminalPaymentIntent } from '@/lib/stripe/terminal';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

const CreatePaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  customer_id: z.string().uuid('Invalid customer ID'),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

/**
 * Create a PaymentIntent for Terminal
 * Returns the PaymentIntent client_secret for use with Terminal SDK
 */
export async function POST(request: NextRequest) {
  const logContext = { endpoint: 'terminal/payment', method: 'POST' };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      return NextResponse.json(
        { error: 'Forbidden - Staff only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = CreatePaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { amount, customer_id, description, metadata } = validation.data;

    // Get customer details
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

    // Get or create Stripe customer
    const existingStripeCustomerId = customer[customerIdColumn as keyof typeof customer] as string | null;
    const stripeCustomerId =
      existingStripeCustomerId ||
      (await getOrCreateStripeCustomer(
        customer.id,
        customer.email || '',
        customer.name || '',
        customer.phone
      ));

    // Create the Terminal PaymentIntent
    const paymentIntent = await createTerminalPaymentIntent({
      amount,
      customerId: stripeCustomerId,
      description,
      metadata: {
        ...metadata,
        customer_id,
        pos_transaction: 'true',
        terminal_payment: 'true',
      },
    });

    logger.info(
      {
        ...logContext,
        paymentIntentId: paymentIntent.id,
        customerId: customer_id,
        amount,
      },
      '💳 Terminal PaymentIntent created'
    );

    return NextResponse.json({
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Failed to create Terminal payment');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'terminal_create_payment' },
    });

    return NextResponse.json(
      {
        error: 'Failed to create payment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

