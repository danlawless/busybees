/**
 * Admin API: Coupons
 * GET  - List all coupons (paginated)
 * POST - Create a new single-use coupon code (amount or percent)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { createCoupon, listCoupons } from '@/lib/services/coupons';

const CreateCouponSchema = z.object({
  name: z.string().max(120).optional(),
  discount_type: z.enum(['amount', 'percent']),
  amount: z.number().positive().max(1000).optional(),
  discount_percent: z.number().positive().max(100).optional(),
  notes: z.string().max(500).optional(),
  createdByAdmin: z.string().max(120).optional(),
}).refine(
  (data) =>
    (data.discount_type === 'amount' && data.amount != null && data.discount_percent == null) ||
    (data.discount_type === 'percent' && data.discount_percent != null && data.amount == null),
  { message: 'amount required for type=amount; discount_percent required for type=percent' }
);

export async function GET() {
  try {
    const coupons = await listCoupons();

    const total = coupons.length;
    const active = coupons.filter(c => c.status === 'active').length;
    const redeemed = coupons.filter(c => c.status === 'redeemed').length;
    const totalRedeemed = coupons.reduce((s, c) => s + Number(c.amount_applied || 0), 0);

    return NextResponse.json({
      coupons,
      stats: { total, active, redeemed, totalRedeemed },
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
    logger.info(
      { couponId: coupon.id, type: coupon.discount_type, amount: coupon.amount, percent: coupon.discount_percent },
      '🎟️ Coupon created'
    );
    return NextResponse.json({ coupon });
  } catch (error) {
    logger.error({ error }, 'Failed to create coupon');
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}
