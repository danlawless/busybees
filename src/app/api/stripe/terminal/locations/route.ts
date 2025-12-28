/**
 * Stripe Terminal Locations API
 * Manages physical business locations for Terminal readers
 *
 * GET  /api/stripe/terminal/locations - List all locations
 * POST /api/stripe/terminal/locations - Create a new location
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLocation, listLocations } from '@/lib/stripe/terminal';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

const CreateLocationSchema = z.object({
  display_name: z.string().min(1, 'Display name is required'),
  address: z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postal_code: z.string().min(1, 'Postal code is required'),
    country: z.string().length(2, 'Country must be 2-letter code').default('US'),
  }),
});

/**
 * List all Terminal locations
 */
export async function GET() {
  const logContext = { endpoint: 'terminal/locations', method: 'GET' };

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

    const locations = await listLocations();

    logger.info(
      { ...logContext, count: locations.length },
      '📍 Terminal locations listed'
    );

    return NextResponse.json({ locations });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Failed to list locations');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'terminal_list_locations' },
    });

    return NextResponse.json(
      { error: 'Failed to list locations' },
      { status: 500 }
    );
  }
}

/**
 * Create a new Terminal location
 */
export async function POST(request: NextRequest) {
  const logContext = { endpoint: 'terminal/locations', method: 'POST' };

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
    const validation = CreateLocationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { display_name, address } = validation.data;

    const location = await createLocation(display_name, {
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postal_code,
      country: address.country,
    });

    logger.info(
      { ...logContext, locationId: location.id, displayName: display_name },
      '📍 Terminal location created'
    );

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    logger.error({ ...logContext, error }, '❌ Failed to create location');

    Sentry.captureException(error, {
      tags: { component: 'api', action: 'terminal_create_location' },
    });

    return NextResponse.json(
      {
        error: 'Failed to create location',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

