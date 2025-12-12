/**
 * Gift Card Denominations API Route
 * Admin management of gift card amounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getAllGiftCardDenominations,
  upsertGiftCardDenomination,
  deleteGiftCardDenomination,
} from '@/lib/services/gift-cards';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const denominationSchema = z.object({
  id: z.string().uuid().optional(),
  amount: z.number().positive('Amount must be positive'),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

/**
 * Check if user is admin
 */
async function requireAdmin(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || userData.role !== 'admin') {
    return { authorized: false, error: 'Forbidden', status: 403 };
  }

  return { authorized: true, user };
}

/**
 * GET /api/gift-cards/denominations
 * Get all denominations (admin only - includes inactive)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const denominations = await getAllGiftCardDenominations();
    return NextResponse.json({ denominations });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch denominations');
    return NextResponse.json(
      { error: 'Failed to fetch denominations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gift-cards/denominations
 * Create or update a denomination
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json();

    const validation = denominationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const denomination = await upsertGiftCardDenomination(validation.data);

    logger.info(
      { denominationId: denomination.id, amount: denomination.amount },
      '💰 Gift card denomination saved'
    );

    return NextResponse.json({ denomination }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to save denomination');
    return NextResponse.json(
      { error: 'Failed to save denomination' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gift-cards/denominations?id=XXX
 * Delete a denomination
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Denomination ID is required' },
      { status: 400 }
    );
  }

  try {
    await deleteGiftCardDenomination(id);

    logger.info({ denominationId: id }, '🗑️ Gift card denomination deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete denomination');
    return NextResponse.json(
      { error: 'Failed to delete denomination' },
      { status: 500 }
    );
  }
}

