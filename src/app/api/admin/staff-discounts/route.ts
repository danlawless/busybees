/**
 * API Route: Staff-Only Discounts
 * GET - List active staff-only discounts
 * POST - Create a new staff-only discount
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createStripeCoupon } from '@/lib/stripe/coupons';
import { logger } from '@/lib/logger';

/**
 * GET - List active staff-only discounts
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get staff-only promos that are active and within date range
    const now = new Date().toISOString().split('T')[0];
    const { data: promos, error } = await supabase
      .from('promos')
      .select('*')
      .eq('is_staff_only', true)
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .order('name');

    if (error) {
      logger.error({ error }, 'Failed to fetch staff-only discounts');
      throw error;
    }

    return NextResponse.json(promos || []);
  } catch (error) {
    logger.error({ error }, 'Error fetching staff discounts');
    return NextResponse.json(
      { error: 'Failed to fetch staff discounts' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new staff-only discount
 * Creates a Stripe coupon WITHOUT a promotion code (customers can't enter it)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is staff/admin
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
    const {
      name,
      discount_percent,
      description,
      start_date,
      end_date,
      duration = 'once',
      max_redemptions,
    } = body;

    // Validate required fields
    if (!name || !discount_percent || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: name, discount_percent, start_date, end_date' },
        { status: 400 }
      );
    }

    if (discount_percent <= 0 || discount_percent > 100) {
      return NextResponse.json(
        { error: 'Discount percent must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Generate a unique coupon ID for Stripe
    const couponId = `STAFF_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now()}`;

    // Create the coupon in Stripe (no promotion code = customers can't enter it)
    const stripeCoupon = await createStripeCoupon({
      id: couponId,
      name: `[Staff Only] ${name}`,
      percent_off: discount_percent,
      duration,
      max_redemptions,
      metadata: {
        created_via: 'busybees_staff_discount',
        is_staff_only: 'true',
      },
    });

    logger.info({ couponId: stripeCoupon.id }, 'Created staff-only Stripe coupon');

    // Create the promo in the database
    const { data: promo, error: promoError } = await supabase
      .from('promos')
      .insert({
        name,
        start_date,
        end_date,
        discount_percent,
        description: description || `Staff-only ${discount_percent}% discount`,
        stripe_coupon_id: stripeCoupon.id,
        stripe_coupon_code: couponId, // Store the coupon ID (not a promo code)
        banner_style: 'minimal',
        is_active: true,
        is_staff_only: true,
      })
      .select()
      .single();

    if (promoError) {
      logger.error({ error: promoError }, 'Failed to create promo in database');
      throw promoError;
    }

    logger.info({ promoId: promo.id, couponId: stripeCoupon.id }, 'Created staff-only discount');

    return NextResponse.json({
      success: true,
      promo,
      stripe_coupon_id: stripeCoupon.id,
    });
  } catch (error) {
    logger.error({ error }, 'Error creating staff discount');
    return NextResponse.json(
      { error: 'Failed to create staff discount', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
