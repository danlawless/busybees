/**
 * Admin Events API
 * GET /api/admin/events - List all events (including drafts)
 * POST /api/admin/events - Create a new event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { CreateEventSchema } from '@/lib/validations/event';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify staff/admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['admin', 'staff'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch all events using admin client to bypass RLS
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch events');
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error({ error }, 'Unexpected error fetching events');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify staff/admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['admin', 'staff'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateEventSchema.parse(body);

    // Create event using admin client
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('events')
      .insert({
        ...validatedData,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create event');
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    logger.info(
      { eventId: data.id, title: data.title, adminEmail: user.email },
      'Created event'
    );

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error({ error }, 'Unexpected error creating event');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
