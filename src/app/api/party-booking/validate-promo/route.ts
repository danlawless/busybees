/**
 * Validate a customer-typed party promo code.
 *
 * POST { code } -> { valid, discountPercent, name, code } | { valid: false, error }
 *
 * This is a preview only — the price is NOT trusted from the client. The party
 * booking create route re-validates the same code server-side and computes the
 * authoritative discount before charging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActivePartyPromoByCode } from '@/lib/services/promos';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const Schema = z.object({ code: z.string().min(1).max(50) });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ valid: false, error: 'Please enter a promo code' }, { status: 400 });
    }

    const promo = await getActivePartyPromoByCode(parsed.data.code);

    if (!promo || promo.discountPercent <= 0) {
      return NextResponse.json({
        valid: false,
        error: "That promo code isn't valid or has expired.",
      });
    }

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discountPercent: promo.discountPercent,
      name: promo.name,
    });
  } catch (error) {
    logger.error({ error }, 'Party promo validation error');
    return NextResponse.json({ valid: false, error: 'Could not validate promo code. Please try again.' }, { status: 500 });
  }
}
