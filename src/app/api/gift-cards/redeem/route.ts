/**
 * Gift Card Redemption API Route
 * Handles redeeming gift cards to add balance to user accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validateGiftCard,
  redeemGiftCard,
  getGiftCardByCode,
} from '@/lib/services/gift-cards';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const redeemSchema = z.object({
  code: z.string().min(1, 'Gift card code is required'),
});

const validateSchema = z.object({
  code: z.string().min(1, 'Gift card code is required'),
});

/**
 * GET /api/gift-cards/redeem?code=XXX
 * Validate a gift card code (check if it exists and is redeemable)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: 'Gift card code is required' },
      { status: 400 }
    );
  }

  try {
    const result = await validateGiftCard(code);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 200 }
      );
    }

    // Return validation result with limited gift card info (hide sensitive data)
    return NextResponse.json({
      valid: true,
      gift_card: {
        amount: result.gift_card!.amount,
        remaining_amount: result.gift_card!.remaining_amount,
        status: result.gift_card!.status,
        purchaser_name: result.gift_card!.purchaser_name,
        personal_message: result.gift_card!.personal_message,
      },
    });
  } catch (error) {
    logger.error({ error, code }, 'Failed to validate gift card');
    return NextResponse.json(
      { error: 'Failed to validate gift card' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gift-cards/redeem
 * Redeem a gift card - requires authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to redeem a gift card' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = redeemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { code } = validation.data;

    // Attempt to redeem
    const result = await redeemGiftCard(code, user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    logger.info(
      { userId: user.id, amount: result.amount_credited },
      '🎉 Gift card redeemed via API'
    );

    return NextResponse.json({
      success: true,
      amount_credited: result.amount_credited,
      new_balance: result.new_balance,
      message: `$${result.amount_credited?.toFixed(2)} has been added to your account!`,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to redeem gift card');
    return NextResponse.json(
      { error: 'Failed to redeem gift card' },
      { status: 500 }
    );
  }
}

