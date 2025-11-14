/**
 * API Route: Stripe Prices
 * POST - Create a new price
 * GET - List all prices
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStripePrice, listStripePrices } from '@/lib/stripe/products';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify user is staff/admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const price = await createStripePrice(body);

    return NextResponse.json(price);
  } catch (error) {
    console.error('Error creating Stripe price:', error);
    return NextResponse.json(
      { error: 'Failed to create price', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product');

    const prices = await listStripePrices(productId || undefined);

    return NextResponse.json(prices);
  } catch (error) {
    console.error('Error listing Stripe prices:', error);
    return NextResponse.json(
      { error: 'Failed to list prices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

