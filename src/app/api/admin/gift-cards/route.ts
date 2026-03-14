/**
 * API Route: Admin Gift Cards
 * GET - List all gift cards for the POS admin dashboard
 *
 * Uses admin client (service role) to bypass RLS since POS staff
 * authentication is PIN-based rather than Supabase session-based.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: giftCards, error } = await supabase
      .from('gift_cards')
      .select('id, code, amount, remaining_amount, purchaser_email, purchaser_name, recipient_email, recipient_name, delivery_method, status, email_sent_at, redeemed_at, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch gift cards');
      return NextResponse.json(
        { error: 'Failed to fetch gift cards' },
        { status: 500 }
      );
    }

    const cards = giftCards || [];

    const stats = {
      total: cards.length,
      totalValue: cards.reduce((sum, c) => sum + Number(c.amount), 0),
      totalRemaining: cards.reduce((sum, c) => sum + Number(c.remaining_amount), 0),
      pending: cards.filter(c => c.status === 'pending').length,
      sent: cards.filter(c => c.status === 'sent').length,
      redeemed: cards.filter(c => c.status === 'redeemed' || c.status === 'partially_redeemed').length,
    };

    logger.info({ count: cards.length }, 'Admin gift cards fetched');

    return NextResponse.json({ giftCards: cards, stats });
  } catch (error) {
    logger.error({ error }, 'Admin gift cards fetch error');
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
