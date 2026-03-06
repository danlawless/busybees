/**
 * API Route: Send Test Newsletter
 * POST - Send a test newsletter email to a single email address
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendNewsletterEmail, sendHtmlNewsletterEmail, isEmailServiceConfigured } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const legacyTestSchema = z.object({
  testEmail: z.string().email('Invalid test email address'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  heading: z.string().min(1, 'Heading is required').max(200, 'Heading too long'),
  body: z.string().min(1, 'Body content is required').max(10000, 'Body content too long'),
  ctaText: z.string().max(100, 'Button text too long').optional(),
  ctaUrl: z.string().url('Invalid button URL').optional(),
});

const htmlTestSchema = z.object({
  mode: z.literal('html'),
  testEmail: z.string().email('Invalid test email address'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  html: z.string().min(1, 'HTML content is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const isHtmlMode = body.mode === 'html';

    if (isHtmlMode) {
      const validationResult = htmlTestSchema.safeParse(body);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((i) => i.message).join(', ');
        return NextResponse.json({ error: errorMessages }, { status: 400 });
      }
    } else {
      const validationResult = legacyTestSchema.safeParse(body);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((i) => i.message).join(', ');
        return NextResponse.json({ error: errorMessages }, { status: 400 });
      }
    }

    if (!isEmailServiceConfigured()) {
      logger.error('Test newsletter send attempted but RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service not configured. RESEND_API_KEY environment variable is missing.' },
        { status: 503 }
      );
    }

    const testEmail = body.testEmail as string;
    const subject = body.subject as string;

    logger.info({ testEmail, subject, mode: isHtmlMode ? 'html' : 'legacy' }, 'Sending test newsletter email');

    const result = isHtmlMode
      ? await sendHtmlNewsletterEmail({
          to: testEmail,
          subject: `[TEST] ${subject}`,
          html: body.html,
          subscriberEmail: testEmail,
        })
      : await sendNewsletterEmail({
          to: testEmail,
          subscriberName: 'Test Subscriber',
          subject: `[TEST] ${subject}`,
          heading: body.heading,
          body: body.body,
          ctaText: body.ctaText || undefined,
          ctaUrl: body.ctaUrl || undefined,
          subscriberEmail: testEmail,
        });

    if (result.success) {
      logger.info({ testEmail, messageId: result.messageId }, 'Test newsletter sent successfully');
      return NextResponse.json({ success: true, messageId: result.messageId });
    }

    return NextResponse.json(
      { error: result.error || 'Failed to send test email' },
      { status: 500 }
    );
  } catch (error) {
    logger.error({ error }, 'Test newsletter send error');
    return NextResponse.json({ error: 'Failed to send test newsletter' }, { status: 500 });
  }
}
