/**
 * Stripe Customers API
 * POST - Create Stripe customer for a user
 * GET - Get Stripe customer with payment methods
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getOrCreateStripeCustomer,
  listPaymentMethods,
} from '@/lib/stripe/payment-methods';
import { getStripeClient, getStripeCustomerIdColumn } from '@/lib/stripe/client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(
      user.id,
      profile.email || user.email!,
      profile.name,
      profile.phone
    );

    return NextResponse.json({
      customerId: stripeCustomerId,
    });
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    return NextResponse.json(
      {
        error: 'Failed to create Stripe customer',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with Stripe customer ID (mode-aware)
    const customerIdColumn = await getStripeCustomerIdColumn();
    const { data: profile } = await supabase
      .from('users')
      .select(`${customerIdColumn}`)
      .eq('id', user.id)
      .single();

    const stripeCustomerId = profile?.[customerIdColumn];

    if (!stripeCustomerId) {
      return NextResponse.json({
        customer: null,
        paymentMethods: [],
      });
    }

    // Get Stripe customer details
    const stripe = await getStripeClient();
    const customer = await stripe.customers.retrieve(stripeCustomerId);

    if (customer.deleted) {
      return NextResponse.json(
        { error: 'Customer has been deleted' },
        { status: 404 }
      );
    }

    // Get payment methods
    const paymentMethods = await listPaymentMethods(stripeCustomerId);

    return NextResponse.json({
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        defaultPaymentMethod: customer.invoice_settings?.default_payment_method,
      },
      paymentMethods,
    });
  } catch (error) {
    console.error('Error fetching Stripe customer:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Stripe customer',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

