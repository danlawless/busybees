/**
 * Admin Single Event API
 * PATCH /api/admin/events/[id] - Update an event
 * DELETE /api/admin/events/[id] - Delete an event and its image
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { UpdateEventSchema } from '@/lib/validations/event';
import { z } from 'zod';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const validatedData = UpdateEventSchema.parse(body);

    // Update event using admin client
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('events')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ error, eventId: id }, 'Failed to update event');
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    logger.info(
      { eventId: id, updates: Object.keys(validatedData), adminEmail: user.email },
      'Updated event'
    );

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error({ error }, 'Unexpected error updating event');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const adminSupabase = createAdminClient();

    // Fetch event to get image URL for cleanup
    const { data: event } = await adminSupabase
      .from('events')
      .select('image_url')
      .eq('id', id)
      .single();

    // Delete the event
    const { error } = await adminSupabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ error, eventId: id }, 'Failed to delete event');
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    // Clean up image from storage
    if (event?.image_url) {
      try {
        // Extract filename from the public URL
        const url = new URL(event.image_url);
        const pathParts = url.pathname.split('/event-images/');
        if (pathParts.length > 1) {
          const filePath = decodeURIComponent(pathParts[1]);
          await adminSupabase.storage.from('event-images').remove([filePath]);
        }
      } catch (cleanupError) {
        // Log but don't fail the request - the event is already deleted
        logger.warn({ error: cleanupError, eventId: id }, 'Failed to clean up event image');
      }
    }

    logger.info({ eventId: id, adminEmail: user.email }, 'Deleted event');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Unexpected error deleting event');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
