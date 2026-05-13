import { NextRequest, NextResponse } from 'next/server';
import { sendSuggestionEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const SuggestionSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email('Please enter a valid email').max(254).optional().or(z.literal('')),
  message: z.string().trim().min(5, 'Please share a few words').max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SuggestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await sendSuggestionEmail({
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      message: parsed.data.message,
    });

    if (!result.success) {
      logger.error({ error: result.error }, 'Suggestion email failed');
      return NextResponse.json(
        { error: 'We could not send your suggestion right now. Please try again or email info@busybeesipc.com directly.' },
        { status: 500 }
      );
    }

    logger.info({ hasEmail: !!parsed.data.email }, '💌 Suggestion submitted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Suggestion route error');
    return NextResponse.json(
      { error: 'Failed to submit suggestion' },
      { status: 500 }
    );
  }
}
