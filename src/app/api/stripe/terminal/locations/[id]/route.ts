/**
 * Stripe Terminal Location Management API
 * Manage individual Terminal locations
 *
 * GET    /api/stripe/terminal/locations/[id] - Get location details
 * PATCH  /api/stripe/terminal/locations/[id] - Update location
 * DELETE /api/stripe/terminal/locations/[id] - Delete location
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getLocation,
  updateLocation,
  deleteLocation,
} from '@/lib/stripe/terminal';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UpdateLocationSchema = z.object({
  display_name: z.string().min(1).optional(),
  address: z
    .object({
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      postal_code: z.string().min(1),
      country: z.string().length(2).default('US'),
    })
    .optional(),
});

/**
 * Get a specific Terminal location
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const logContext = { endpoint: 'terminal/locations', method: 'GET', locationId: id };

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

    const location = await getLocation(id);

    return NextResponse.json({ location });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Failed to get location');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'terminal_get_location' },
      extra: { locationId: id },
    });

    return NextResponse.json(
      { error: 'Failed to get location' },
      { status: 500 }
    );
  }
}

/**
 * Update a Terminal location
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const logContext = { endpoint: 'terminal/locations', method: 'PATCH', locationId: id };

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
    const validation = UpdateLocationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updates = validation.data;
    const location = await updateLocation(id, {
      displayName: updates.display_name,
      address: updates.address
        ? {
            line1: updates.address.line1,
            line2: updates.address.line2,
            city: updates.address.city,
            state: updates.address.state,
            postalCode: updates.address.postal_code,
            country: updates.address.country,
          }
        : undefined,
    });

    logger.info(logContext, '📍 Terminal location updated');

    return NextResponse.json({ location });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Failed to update location');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'terminal_update_location' },
      extra: { locationId: id },
    });

    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

/**
 * Delete a Terminal location
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const logContext = { endpoint: 'terminal/locations', method: 'DELETE', locationId: id };

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

    await deleteLocation(id);

    logger.info(logContext, '📍 Terminal location deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Failed to delete location');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'terminal_delete_location' },
      extra: { locationId: id },
    });

    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    );
  }
}

