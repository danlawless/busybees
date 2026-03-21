/**
 * Admin API: Announcement by ID
 * PUT - Update an announcement
 * DELETE - Remove an announcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateAnnouncementSchema = z.object({
  message: z.string().min(1).max(500).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  is_active: z.boolean().optional(),
  bg_color: z.string().optional(),
  text_color: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateAnnouncementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('announcements')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to update announcement');
      return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
    }

    return NextResponse.json({ announcement: data });
  } catch (error) {
    logger.error({ error }, 'Announcement update error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ error }, 'Failed to delete announcement');
      return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Announcement delete error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
