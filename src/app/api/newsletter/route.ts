/**
 * API Route: Newsletter Subscription
 * POST - Subscribe to newsletter and store in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { subscribeToNewsletter } from '@/lib/services/newsletter';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const newsletterSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Invalid email format'),
  source: z.enum(['website', 'signup', 'login', 'party_booking', 'pre_register']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = newsletterSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json(
        { error: errorMessages },
        { status: 400 }
      );
    }

    const { name, email, source } = validationResult.data;

    // Subscribe to newsletter
    const result = await subscribeToNewsletter({
      email,
      name: name || undefined,
      source: source || 'website',
    });

    if (!result.success) {
      logger.error({ email }, 'Newsletter signup failed');
      return NextResponse.json(
        { error: 'Failed to process newsletter signup' },
        { status: 500 }
      );
    }

    logger.info({ email, name, isNew: result.isNew }, 'Newsletter signup processed');

    return NextResponse.json({
      success: true,
      message: 'Thank you for joining our newsletter! Welcome to the Busy Bees family.',
    });
  } catch (error) {
    logger.error({ error }, 'Newsletter signup error');
    return NextResponse.json(
      { error: 'Failed to process newsletter signup' },
      { status: 500 }
    );
  }
}
