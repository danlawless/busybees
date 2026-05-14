/**
 * API Route: Send Newsletter
 * POST - Send a newsletter email to all active subscribers using batch API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { buildNewsletterEmailPayload, buildHtmlNewsletterPayload, sendBatchEmails, isEmailServiceConfigured } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Allow up to 120 seconds for batch email sending (Vercel Pro max: 300s)
export const maxDuration = 120;

// Legacy plain text mode
const legacySchema = z.object({
  mode: z.literal('legacy').optional(),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  heading: z.string().min(1, 'Heading is required').max(200, 'Heading too long'),
  body: z.string().min(1, 'Body content is required').max(10000, 'Body content too long'),
  ctaText: z.string().max(100, 'Button text too long').optional(),
  ctaUrl: z.string().url('Invalid button URL').optional(),
});

// WYSIWYG HTML mode
const htmlSchema = z.object({
  mode: z.literal('html'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  html: z.string().min(1, 'HTML content is required'),
  draftId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const isHtmlMode = body.mode === 'html';

    // Validate based on mode
    if (isHtmlMode) {
      const validationResult = htmlSchema.safeParse(body);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((issue) => issue.message).join(', ');
        return NextResponse.json({ error: errorMessages }, { status: 400 });
      }
    } else {
      const validationResult = legacySchema.safeParse(body);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map((issue) => issue.message).join(', ');
        return NextResponse.json({ error: errorMessages }, { status: 400 });
      }
      // Legacy CTA validation
      if ((body.ctaText && !body.ctaUrl) || (!body.ctaText && body.ctaUrl)) {
        return NextResponse.json(
          { error: 'Both button text and URL must be provided together' },
          { status: 400 }
        );
      }
    }

    if (!isEmailServiceConfigured()) {
      logger.error('Newsletter send attempted but RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service not configured. RESEND_API_KEY environment variable is missing.' },
        { status: 503 }
      );
    }

    // Fetch all active subscribers (paginated to bypass Supabase 1000-row cap)
    const supabase = createAdminClient();
    type SubscriberRow = { email: string; name: string | null };
    const PAGE_SIZE = 1000;
    const subscribers: SubscriberRow[] = [];
    let from = 0;
    while (true) {
      const { data: pageData, error: fetchError } = await supabase
        .from('newsletter_subscribers')
        .select('email, name')
        .eq('is_active', true)
        .range(from, from + PAGE_SIZE - 1);

      if (fetchError) {
        logger.error({ error: fetchError }, 'Failed to fetch active subscribers for newsletter send');
        return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
      }

      const rows = pageData || [];
      subscribers.push(...rows);
      if (rows.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    if (subscribers.length === 0) {
      return NextResponse.json({ error: 'No active subscribers to send to' }, { status: 400 });
    }

    const subject = body.subject as string;

    logger.info(
      { subscriberCount: subscribers.length, subject, mode: isHtmlMode ? 'html' : 'legacy' },
      'Starting newsletter batch send'
    );

    // Build payloads based on mode
    const payloads = subscribers.map(subscriber => {
      if (isHtmlMode) {
        return buildHtmlNewsletterPayload({
          to: subscriber.email,
          subject,
          html: body.html,
          subscriberEmail: subscriber.email,
        });
      }
      return buildNewsletterEmailPayload({
        to: subscriber.email,
        subscriberName: subscriber.name || 'Friend',
        subject,
        heading: body.heading,
        body: body.body,
        ctaText: body.ctaText || undefined,
        ctaUrl: body.ctaUrl || undefined,
        subscriberEmail: subscriber.email,
      });
    });

    const result = await sendBatchEmails(payloads);

    // If HTML mode with draftId, mark draft as sent
    if (isHtmlMode && body.draftId) {
      await supabase
        .from('newsletter_drafts')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_count: subscribers.length,
        })
        .eq('id', body.draftId);
    }

    logger.info(
      { sent: result.sent, failed: result.failed, total: subscribers.length, subject },
      'Newsletter batch send complete'
    );

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      total: subscribers.length,
      errors: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    logger.error({ error }, 'Newsletter send error');
    return NextResponse.json({ error: 'Failed to send newsletter' }, { status: 500 });
  }
}
