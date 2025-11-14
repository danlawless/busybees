/**
 * Stripe Checkout API Route
 * Create checkout sessions for purchases
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe/checkout';

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
    } = body;

    // Validate required fields
    if (!productId || !productName || productPrice === undefined || !purchaseType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customerId: user.id,
      customerEmail: profile.email || user.email!,
      lineItems: [{
        price: productPrice,
        quantity,
        name: productName,
        description: productDescription,
      }],
      metadata: {
        purchase_type: purchaseType,
        product_id: productId,
        child_id: childId,
        ...metadata,
      },
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/customer/purchases?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/customer/passes`,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    }, { status: 200 });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

