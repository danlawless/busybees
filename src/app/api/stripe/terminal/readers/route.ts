/**
 * Stripe Terminal Readers API
 * Manages Terminal card readers
 *
 * GET  /api/stripe/terminal/readers - List all readers
 * POST /api/stripe/terminal/readers - Register a new reader (internet-connected only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listReaders, registerReader } from '@/lib/stripe/terminal';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

const RegisterReaderSchema = z.object({
  registration_code: z.string().min(1, 'Registration code is required'),
  location_id: z.string().min(1, 'Location ID is required'),
  label: z.string().optional(),
});

/**
 * List all Terminal readers
 */
export async function GET(request: NextRequest) {
  const logContext = { endpoint: 'terminal/readers', method: 'GET' };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check staff/admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Staff only' },
        { status: 403 }
      );
    }

    // Optional location filter
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id') || undefined;

    const readers = await listReaders(locationId);

    logger.info(
      { ...logContext, count: readers.length, locationId },
      '📱 Terminal readers listed'
    );

    return NextResponse.json({ readers });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Failed to list readers');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'terminal_list_readers' },
    });

    return NextResponse.json(
      { error: 'Failed to list readers' },
      { status: 500 }
    );
  }
}

/**
 * Register a new Terminal reader (internet-connected readers only)
 *
 * Note: Bluetooth readers like the M2 are registered via the mobile SDK,
 * not through this API. This endpoint is for readers like S700 and WisePOS E.
 */
export async function POST(request: NextRequest) {
  const logContext = { endpoint: 'terminal/readers', method: 'POST' };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = RegisterReaderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { registration_code, location_id, label } = validation.data;

    const reader = await registerReader(registration_code, location_id, label);

    logger.info(
      { ...logContext, readerId: reader.id, label, locationId: location_id },
      '📱 Terminal reader registered'
    );

    return NextResponse.json({ reader }, { status: 201 });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Failed to register reader');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'terminal_register_reader' },
    });

    return NextResponse.json(
      {
        error: 'Failed to register reader',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

