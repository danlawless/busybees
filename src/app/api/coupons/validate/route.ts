/**
 * Public API: Validate a coupon code (POS pre-check before applying at checkout).
 * GET /api/coupons/validate?code=XXX
 *
 * Returns coupon details if active and unexpired, otherwise an error message.
 * Does NOT redeem — that happens atomically inside the day-pass purchase route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/services/coupons';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ valid: false, error: 'Coupon code is required' }, { status: 400 });
  }

  const result = await validateCoupon(code);
  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    coupon: {
      id: result.coupon!.id,
      code: result.coupon!.code,
      amount: result.coupon!.amount,
      expires_at: result.coupon!.expires_at,
    },
  });
}
