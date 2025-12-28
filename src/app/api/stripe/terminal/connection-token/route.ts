/**
 * Stripe Terminal Connection Token API
 * Creates connection tokens for Terminal SDK authentication
 *
 * POST /api/stripe/terminal/connection-token
 *
 * The Terminal SDK (web or mobile) calls this endpoint to get a fresh
 * connection token whenever it needs to authenticate with Stripe.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createConnectionToken } from '@/lib/stripe/terminal';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  const logContext = { endpoint: 'terminal/connection-token' };

  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.warn(logContext, '🚫 Unauthorized connection token request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check staff/admin role - only staff can use Terminal
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      logger.warn(
        { ...logContext, userId: user.id },
        '🚫 Non-staff attempted Terminal access'
      );
      return NextResponse.json(
        { error: 'Forbidden - Staff only' },
        { status: 403 }
      );
    }

    // Parse optional location from request body
    let locationId: string | undefined;
    try {
      const body = await request.json();
      locationId = body.location_id;
    } catch {
      // No body or invalid JSON is fine - locationId stays undefined
    }

    // Create the connection token
    const secret = await createConnectionToken(locationId);

    logger.info(
      { ...logContext, userId: user.id, locationId },
      '🔌 Connection token issued'
    );

    return NextResponse.json({ secret });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Failed to create connection token');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'terminal_connection_token' },
    });

    return NextResponse.json(
      {
        error: 'Failed to create connection token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

