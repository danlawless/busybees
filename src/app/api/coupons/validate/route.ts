/**
 * Public API: Validate a coupon code (POS pre-check before applying at checkout).
 * GET /api/coupons/validate?code=XXX[&passPrice=N]
 *
 * Returns coupon details if active and unexpired. If passPrice is provided,
 * also returns the computed discount preview.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon, computeCouponDiscount } from '@/lib/services/coupons';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const passPriceParam = request.nextUrl.searchParams.get('passPrice');
  if (!code) {
    return NextResponse.json({ valid: false, error: 'Coupon code is required' }, { status: 400 });
  }

  const result = await validateCoupon(code);
  if (!result.valid || !result.coupon) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 200 });
  }

  const c = result.coupon;
  const preview = passPriceParam
    ? computeCouponDiscount(c, Number(passPriceParam))
    : null;

  return NextResponse.json({
    valid: true,
    coupon: {
      id: c.id,
      code: c.code,
      name: c.name,
      discount_type: c.discount_type,
      amount: c.amount,
      discount_percent: c.discount_percent,
      expires_at: c.expires_at,
    },
    preview,
  });
}
