/**
 * API Route: Newsletter Unsubscribe
 * POST - Unsubscribe an email from the newsletter
 */

import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeFromNewsletter } from '@/lib/services/newsletter';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const unsubscribeSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = unsubscribeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;
    const success = await unsubscribeFromNewsletter(email);

    if (success) {
      logger.info({ email }, '📧 Newsletter unsubscribe via link');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  } catch (error) {
    logger.error({ error }, 'Newsletter unsubscribe error');
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}
