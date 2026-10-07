/**
 * Retired. This route let any caller -- signed in or not -- name a customer, a
 * price and the Checkout Session metadata, and the Stripe webhook acts on that
 * metadata (it creates purchases, and gift cards of `metadata.amount`). Nothing
 * on the site calls it any more: customers pay through /api/stripe/direct-payment,
 * the POS through /api/stripe/kiosk-payment, gift cards and party bookings
 * through their own routes, each of which sets its own price and metadata.
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST() {
  logger.warn({ route: '/api/stripe/checkout' }, 'Refused a call to a retired checkout route');
  return NextResponse.json({ error: 'This checkout route is no longer available.' }, { status: 410 });
}
