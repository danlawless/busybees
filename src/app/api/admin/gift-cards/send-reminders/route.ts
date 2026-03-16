/**
 * Admin API: Send Gift Card Reminder Emails
 * POST /api/admin/gift-cards/send-reminders
 * Sends reminder emails to all gift card recipients with remaining balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendGiftCardReminderEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Auth: allow cron secret or admin session
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Authorized via cron secret
    } else if (process.env.NODE_ENV !== 'production' && !cronSecret) {
      // Allow in dev when no cron secret is configured
    } else {
      // Check for admin PIN header (staff auth)
      const pinHeader = request.headers.get('x-admin-pin');
      if (!pinHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const supabaseAuth = createAdminClient();
      const { data: settings } = await supabaseAuth
        .from('settings')
        .select('value')
        .eq('key', 'admin_pin')
        .single();

      if (!settings || settings.value !== pinHeader) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
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
      logger.error({ error }, 'Failed to fetch gift cards for reminders');
      return NextResponse.json({ error: 'Failed to fetch gift cards' }, { status: 500 });
    }

    if (!giftCards || giftCards.length === 0) {
      return NextResponse.json({ message: 'No gift cards with remaining balance found', sent: 0 });
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
        logger.info({ code: card.code, to: recipientEmail }, 'Gift card reminder sent');
      } else {
        failed++;
        errors.push({ email: recipientEmail, error: result.error || 'Unknown error' });
        logger.error({ code: card.code, error: result.error }, 'Failed to send gift card reminder');
      }
    }

    logger.info({ sent, failed, total: giftCards.length }, 'Gift card reminder batch complete');

    return NextResponse.json({
      message: `Sent ${sent} reminder${sent !== 1 ? 's' : ''}`,
      sent,
      failed,
      total: giftCards.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error({ error }, 'Gift card reminder route error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
