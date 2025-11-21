/**
 * Stripe Payment Methods API
 * POST - Create SetupIntent for adding new payment method
 * GET - List saved payment methods for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getOrCreateStripeCustomer,
  createSetupIntent,
  listPaymentMethods,
  syncPaymentMethodsToDatabase,
} from '@/lib/stripe/payment-methods';

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

    // Create SetupIntent
    const setupIntent = await createSetupIntent(stripeCustomerId);

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      {
        error: 'Failed to create setup intent',
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

    // Get user with Stripe customer ID
    const { data: profile } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      // No Stripe customer yet, return empty array
      return NextResponse.json({ paymentMethods: [] });
    }

    // Sync payment methods from Stripe to database
    await syncPaymentMethodsToDatabase(user.id, profile.stripe_customer_id);

    // Get payment methods from database
    const { data: savedCards, error } = await supabase
      .from('saved_cards')
      .select('*')
      .eq('customer_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ paymentMethods: savedCards || [] });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch payment methods',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

