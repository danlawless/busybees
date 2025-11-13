/**
 * API Route: Stripe Coupon by ID
 * GET - Get a specific coupon
 * PUT - Update a coupon
 * DELETE - Delete a coupon
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeCoupon, updateStripeCoupon, deleteStripeCoupon } from '@/lib/stripe/coupons';
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
    const coupon = await getStripeCoupon(id);
    return NextResponse.json(coupon);
  } catch (error) {
    console.error('Error getting Stripe coupon:', error);
    return NextResponse.json(
      { error: 'Failed to get coupon', details: error instanceof Error ? error.message : 'Unknown error' },
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

    const coupon = await updateStripeCoupon(id, body);
    return NextResponse.json(coupon);
  } catch (error) {
    console.error('Error updating Stripe coupon:', error);
    return NextResponse.json(
      { error: 'Failed to update coupon', details: error instanceof Error ? error.message : 'Unknown error' },
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
    const coupon = await deleteStripeCoupon(id);

    // Also delete corresponding promo from database
    const supabase = await createClient();
    await supabase.from('promos').delete().eq('stripe_coupon_id', id);

    return NextResponse.json(coupon);
  } catch (error) {
    console.error('Error deleting Stripe coupon:', error);
    return NextResponse.json(
      { error: 'Failed to delete coupon', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

