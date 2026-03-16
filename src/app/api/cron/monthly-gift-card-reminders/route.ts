/**
 * Cron Route: Monthly Gift Card Balance Reminders
 * Runs on the 1st of every month at 10:00 AM EST (15:00 UTC)
 * Sends reminder emails to gift card recipients with remaining balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendGiftCardReminderEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = createAdminClient();

    // Fetch all gift cards that have been sent and have remaining balance
    const { data: giftCards, error } = await supabase
      .from('gift_cards')
      .select('id, code, amount, remaining_amount, recipient_email, recipient_name, purchaser_name, status')
      .in('status', ['sent', 'partially_redeemed'])
      .gt('remaining_amount', 0);

    if (error) {
      logger.error({ error }, 'Failed to fetch gift cards for monthly reminders');
      return NextResponse.json({ success: false, error: 'Failed to fetch gift cards' }, { status: 500 });
    }

    if (!giftCards || giftCards.length === 0) {
      logger.info('No gift cards with remaining balance found for monthly reminder');
      return NextResponse.json({
        success: true,
        message: 'No gift cards with remaining balance found',
        sent: 0,
        total: 0,
      });
    }

    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (let i = 0; i < giftCards.length; i++) {
      const card = giftCards[i];

      // Rate limit: wait 600ms between sends to stay under 2/sec
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      const recipientEmail = card.recipient_email;
      if (!recipientEmail) {
        failed++;
        errors.push({ email: 'unknown', error: `Gift card ${card.code} has no recipient email` });
        continue;
      }

      const result = await sendGiftCardReminderEmail({
        to: recipientEmail,
        giftCard: {
          code: card.code,
          amount: Number(card.amount),
          remainingAmount: Number(card.remaining_amount),
          recipientName: card.recipient_name || 'Friend',
        },
      });

      if (result.success) {
        sent++;
        logger.info({ code: card.code, to: recipientEmail }, 'Monthly gift card reminder sent');
      } else {
        failed++;
        errors.push({ email: recipientEmail, error: result.error || 'Unknown error' });
        logger.error({ code: card.code, error: result.error }, 'Failed to send monthly gift card reminder');
      }
    }

    logger.info({ sent, failed, total: giftCards.length }, 'Monthly gift card reminder batch complete');

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} reminder${sent !== 1 ? 's' : ''}`,
      sent,
      failed,
      total: giftCards.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Monthly gift card reminder cron error');
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
