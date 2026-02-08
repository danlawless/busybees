/**
 * Gift Cards API Route
 * Handles gift card CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  getGiftCardDenominations,
  getAllGiftCards,
  createGiftCard,
} from '@/lib/services/gift-cards';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Schema for creating a gift card
const createGiftCardSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  purchaser_email: z.string().email('Invalid purchaser email'),
  purchaser_name: z.string().min(1, 'Purchaser name is required'),
  recipient_email: z.string().email('Invalid recipient email'),
  recipient_name: z.string().min(1, 'Recipient name is required'),
  personal_message: z.string().max(500, 'Message too long').optional(),
  delivery_method: z.enum(['email_recipient', 'email_self']),
});

/**
 * GET /api/gift-cards
 * Get gift card denominations (public) or all gift cards (admin)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get('all') === 'true';

  // Check if requesting all gift cards (admin only)
  if (includeAll) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      const status = searchParams.get('status') || undefined;
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const result = await getAllGiftCards({ status, limit, offset });
      return NextResponse.json(result);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch all gift cards');
      return NextResponse.json(
        { error: 'Failed to fetch gift cards' },
        { status: 500 }
      );
    }
  }

  // Public: return denominations only
  try {
    const denominations = await getGiftCardDenominations();
    return NextResponse.json({ denominations });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch gift card denominations');
    return NextResponse.json(
      { error: 'Failed to fetch denominations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gift-cards
 * Create a new gift card (called after successful payment)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = createGiftCardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Validate amount against available denominations
    // Supabase returns NUMERIC(10,2) as strings - coerce for comparison
    const denominations = await getGiftCardDenominations();
    const validAmount = denominations.some(d => Number(d.amount) === Number(data.amount));

    if (!validAmount) {
      return NextResponse.json(
        { error: 'Invalid gift card amount' },
        { status: 400 }
      );
    }

    // Create the gift card
    const giftCard = await createGiftCard({
      amount: data.amount,
      purchaser_email: data.purchaser_email,
      purchaser_name: data.purchaser_name,
      recipient_email: data.recipient_email,
      recipient_name: data.recipient_name,
      personal_message: data.personal_message,
      delivery_method: data.delivery_method,
    });

    logger.info(
      { giftCardId: giftCard.id, amount: data.amount },
      '🎁 Gift card created via API'
    );

    return NextResponse.json({ gift_card: giftCard }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create gift card');
    return NextResponse.json(
      { error: 'Failed to create gift card' },
      { status: 500 }
    );
  }
}

