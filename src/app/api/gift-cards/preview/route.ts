/**
 * Gift Card Preview/Test Email API Route
 * Sends a test email to preview the gift card
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTestGiftCardEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const previewSchema = z.object({
  amount: z.number().positive(),
  purchaser_name: z.string().min(1),
  purchaser_email: z.string().email(),
  recipient_name: z.string().min(1),
  recipient_email: z.string().email(),
  personal_message: z.string().optional(),
  test_email: z.string().email(),
});

/**
 * POST /api/gift-cards/preview
 * Send a test gift card email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = previewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    const result = await sendTestGiftCardEmail({
      to: data.test_email,
      amount: data.amount,
      recipientName: data.recipient_name,
      purchaserName: data.purchaser_name,
      personalMessage: data.personal_message,
    });

    if (result.success) {
      logger.info(
        { to: data.test_email },
        '📧 Test gift card email sent'
      );
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error({ error }, 'Failed to send test gift card email');
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}

