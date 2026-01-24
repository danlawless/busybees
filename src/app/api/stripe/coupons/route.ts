/**
 * API Route: Stripe Coupons
 * POST - Create a new coupon
 * GET - List all coupons
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStripeCoupon, listStripeCoupons } from '@/lib/stripe/coupons';
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
    const coupon = await createStripeCoupon(body);

    // Also create corresponding promo in database if requested
    if (body.create_promo && body.promo_data) {
      const { promo_data } = body;
      await supabase.from('promos').insert({
        name: promo_data.name,
        start_date: promo_data.start_date,
        end_date: promo_data.end_date,
        discount_percent: coupon.percent_off || 0,
        description: promo_data.description,
        stripe_coupon_id: coupon.id,
        stripe_coupon_code: coupon.id,
        banner_style: promo_data.banner_style || 'honeycomb',
        is_active: promo_data.is_active ?? true,
        is_staff_only: promo_data.is_staff_only ?? false,
      });
    }

    return NextResponse.json(coupon);
  } catch (error) {
    console.error('Error creating Stripe coupon:', error);
    return NextResponse.json(
      { error: 'Failed to create coupon', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const coupons = await listStripeCoupons();
    return NextResponse.json(coupons);
  } catch (error) {
    console.error('Error listing Stripe coupons:', error);
    return NextResponse.json(
      { error: 'Failed to list coupons', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

