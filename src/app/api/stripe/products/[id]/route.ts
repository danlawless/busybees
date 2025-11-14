/**
 * API Route: Stripe Product by ID
 * GET - Get a specific product
 * PUT - Update a product
 * DELETE - Archive a product
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeProduct, updateStripeProduct, deleteStripeProduct } from '@/lib/stripe/products';
import { createClient } from '@/lib/supabase/server';

async function verifyStaffAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, status: 401 };
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || !['staff', 'admin'].includes(userData.role)) {
    return { authorized: false, status: 403 };
  }

  return { authorized: true, user };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await getStripeProduct(id);
    return NextResponse.json(product);
  } catch (error) {
    console.error('Error getting Stripe product:', error);
    return NextResponse.json(
      { error: 'Failed to get product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyStaffAccess();
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json();

    const product = await updateStripeProduct(id, body);
    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating Stripe product:', error);
    return NextResponse.json(
      { error: 'Failed to update product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyStaffAccess();
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
    }

    const { id } = await params;
    const product = await deleteStripeProduct(id);
    return NextResponse.json(product);
  } catch (error) {
    console.error('Error deleting Stripe product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

