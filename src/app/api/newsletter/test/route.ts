/**
 * API Route: Send Test Newsletter
 * POST - Send a test newsletter email to a single email address
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendNewsletterEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const testNewsletterSchema = z.object({
  testEmail: z.string().email('Invalid test email address'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  heading: z.string().min(1, 'Heading is required').max(200, 'Heading too long'),
  body: z.string().min(1, 'Body content is required').max(10000, 'Body content too long'),
  ctaText: z.string().max(100, 'Button text too long').optional(),
  ctaUrl: z.string().url('Invalid button URL').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = testNewsletterSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json(
        { error: errorMessages },
        { status: 400 }
      );
    }

    const { testEmail, subject, heading, body: bodyContent, ctaText, ctaUrl } = validationResult.data;

    logger.info(
      { testEmail, subject },
      '📨 Sending test newsletter email'
    );

    const result = await sendNewsletterEmail({
      to: testEmail,
      subscriberName: 'Test Subscriber',
      subject: `[TEST] ${subject}`,
      heading,
      body: bodyContent,
      ctaText: ctaText || undefined,
      ctaUrl: ctaUrl || undefined,
      subscriberEmail: testEmail,
    });

    if (result.success) {
      logger.info({ testEmail, messageId: result.messageId }, '📨 Test newsletter sent successfully');
      return NextResponse.json({ success: true, messageId: result.messageId });
    }

    return NextResponse.json(
      { error: result.error || 'Failed to send test email' },
      { status: 500 }
    );
  } catch (error) {
    logger.error({ error }, 'Test newsletter send error');
    return NextResponse.json(
      { error: 'Failed to send test newsletter' },
      { status: 500 }
    );
  }
}
