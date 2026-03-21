/**
 * Admin API: Announcements CRUD
 * GET - List all announcements
 * POST - Create a new announcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateAnnouncementSchema = z.object({
  message: z.string().min(1).max(500),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  is_active: z.boolean().optional().default(true),
  bg_color: z.string().optional().default('#f59e0b'),
  text_color: z.string().optional().default('#78350f'),
});

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch announcements');
      return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
    }

    return NextResponse.json({ announcements: data || [] });
  } catch (error) {
    logger.error({ error }, 'Announcements route error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateAnnouncementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('announcements')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create announcement');
      return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
    }

    return NextResponse.json({ announcement: data }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Announcement create error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
