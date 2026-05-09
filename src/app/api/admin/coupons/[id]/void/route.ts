/**
 * Admin API: Void an active coupon
 * POST /api/admin/coupons/[id]/void
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { voidCoupon } from '@/lib/services/coupons';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await voidCoupon(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to void coupon' }, { status: 400 });
    }
    logger.info({ couponId: id }, '🎟️ Coupon voided');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to void coupon');
    return NextResponse.json({ error: 'Failed to void coupon' }, { status: 500 });
  }
}
