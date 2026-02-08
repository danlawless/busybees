/**
 * Public Events API
 * GET /api/events - List published events ordered by date (no auth required)
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // Use admin client to query - RLS would also work but admin is simpler
    // since we explicitly filter by status here
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
      .from('events')
      .select('id, title, description, image_url, event_date, event_time_start, event_time_end')
      .eq('status', 'published')
      .order('event_date', { ascending: true });

    if (error) {
      logger.error({ error }, 'Failed to fetch public events');
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error({ error }, 'Unexpected error fetching public events');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
