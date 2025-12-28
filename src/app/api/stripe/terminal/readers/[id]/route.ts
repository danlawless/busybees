/**
 * Stripe Terminal Reader Management API
 * Manage individual Terminal readers
 *
 * GET    /api/stripe/terminal/readers/[id] - Get reader details
 * PATCH  /api/stripe/terminal/readers/[id] - Update reader label
 * DELETE /api/stripe/terminal/readers/[id] - Delete reader
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getReader, updateReader, deleteReader } from '@/lib/stripe/terminal';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UpdateReaderSchema = z.object({
  label: z.string().min(1, 'Label is required'),
});

/**
 * Get a specific Terminal reader
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const logContext = { endpoint: 'terminal/readers', method: 'GET', readerId: id };

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

    const reader = await getReader(id);

    return NextResponse.json({ reader });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Failed to get reader');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'terminal_get_reader' },
      extra: { readerId: id },
    });

    return NextResponse.json({ error: 'Failed to get reader' }, { status: 500 });
  }
}

/**
 * Update a Terminal reader's label
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const logContext = { endpoint: 'terminal/readers', method: 'PATCH', readerId: id };

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
    const validation = UpdateReaderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const reader = await updateReader(id, validation.data.label);

    logger.info(logContext, '📱 Terminal reader updated');

    return NextResponse.json({ reader });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Failed to update reader');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'terminal_update_reader' },
      extra: { readerId: id },
    });

    return NextResponse.json(
      { error: 'Failed to update reader' },
      { status: 500 }
    );
  }
}

/**
 * Delete a Terminal reader
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const logContext = { endpoint: 'terminal/readers', method: 'DELETE', readerId: id };

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

    await deleteReader(id);

    logger.info(logContext, '📱 Terminal reader deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Failed to delete reader');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'terminal_delete_reader' },
      extra: { readerId: id },
    });

    return NextResponse.json(
      { error: 'Failed to delete reader' },
      { status: 500 }
    );
  }
}

