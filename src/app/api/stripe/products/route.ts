/**
 * API Route: Stripe Products
 * POST - Create a new product with price
 * GET - List all products
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProductWithPrice, listStripeProducts } from '@/lib/stripe/products';
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
    const { product, price } = body;

    // Create product with price in Stripe
    const result = await createProductWithPrice(product, price);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating Stripe product:', error);
    return NextResponse.json(
      { error: 'Failed to create product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const products = await listStripeProducts(
      active !== null ? active === 'true' : undefined
    );

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error listing Stripe products:', error);
    return NextResponse.json(
      { error: 'Failed to list products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

