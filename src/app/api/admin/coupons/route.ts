/**
 * Admin API: Coupons
 * GET  - List all coupons (paginated)
 * POST - Create a new single-use coupon code
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { createCoupon, listCoupons } from '@/lib/services/coupons';

const CreateCouponSchema = z.object({
  amount: z.number().positive().max(1000),
  notes: z.string().max(500).optional(),
  createdByAdmin: z.string().max(120).optional(),
});

export async function GET() {
  try {
    const coupons = await listCoupons();

    const total = coupons.length;
    const active = coupons.filter(c => c.status === 'active').length;
    const redeemed = coupons.filter(c => c.status === 'redeemed').length;
    const totalIssued = coupons.reduce((s, c) => s + Number(c.amount), 0);
    const totalRedeemed = coupons.reduce((s, c) => s + Number(c.amount_applied || 0), 0);

    return NextResponse.json({
      coupons,
      stats: { total, active, redeemed, totalIssued, totalRedeemed },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list coupons');
    return NextResponse.json({ error: 'Failed to list coupons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const coupon = await createCoupon(parsed.data);
    logger.info({ couponId: coupon.id, amount: coupon.amount }, '🎟️ Coupon created');
    return NextResponse.json({ coupon });
  } catch (error) {
    logger.error({ error }, 'Failed to create coupon');
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}
