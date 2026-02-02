/**
 * API Route: Send Newsletter
 * POST - Send a newsletter email to all active subscribers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendNewsletterEmail, isEmailServiceConfigured } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const sendNewsletterSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  heading: z.string().min(1, 'Heading is required').max(200, 'Heading too long'),
  body: z.string().min(1, 'Body content is required').max(10000, 'Body content too long'),
  ctaText: z.string().max(100, 'Button text too long').optional(),
  ctaUrl: z.string().url('Invalid button URL').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = sendNewsletterSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json(
        { error: errorMessages },
        { status: 400 }
      );
    }

    const { subject, heading, body: bodyContent, ctaText, ctaUrl } = validationResult.data;

    // If CTA text is provided, URL must also be provided (and vice versa)
    if ((ctaText && !ctaUrl) || (!ctaText && ctaUrl)) {
      return NextResponse.json(
        { error: 'Both button text and URL must be provided together' },
        { status: 400 }
      );
    }

    // Verify email service is configured before attempting to send
    if (!isEmailServiceConfigured()) {
      logger.error('Newsletter send attempted but RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service not configured. RESEND_API_KEY environment variable is missing.' },
        { status: 503 }
      );
    }

    // Fetch all active subscribers
    const supabase = createAdminClient();
    const { data: subscribers, error: fetchError } = await supabase
      .from('newsletter_subscribers')
      .select('email, name')
      .eq('is_active', true);

    if (fetchError) {
      logger.error({ error: fetchError }, 'Failed to fetch active subscribers for newsletter send');
      return NextResponse.json(
        { error: 'Failed to fetch subscribers' },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No active subscribers to send to' },
        { status: 400 }
      );
    }

    logger.info(
      { subscriberCount: subscribers.length, subject },
      '📨 Starting newsletter send'
    );

    // Send to each subscriber with a small delay to avoid rate limits
    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const subscriber of subscribers) {
      try {
        const result = await sendNewsletterEmail({
          to: subscriber.email,
          subscriberName: subscriber.name || 'Friend',
          subject,
          heading,
          body: bodyContent,
          ctaText: ctaText || undefined,
          ctaUrl: ctaUrl || undefined,
          subscriberEmail: subscriber.email,
        });

        if (result.success) {
          sent++;
        } else {
          failed++;
          errors.push({ email: subscriber.email, error: result.error || 'Unknown error' });
        }
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ email: subscriber.email, error: errorMessage });
      }

      // Small delay between sends to avoid rate limiting (50ms)
      if (sent + failed < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    logger.info(
      { sent, failed, total: subscribers.length, subject },
      '📨 Newsletter send complete'
    );

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: subscribers.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    logger.error({ error }, 'Newsletter send error');
    return NextResponse.json(
      { error: 'Failed to send newsletter' },
      { status: 500 }
    );
  }
}
