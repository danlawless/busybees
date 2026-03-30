/**
 * Admin Event Bookings API
 * GET /api/admin/event-bookings - List event bookings with optional event_id filter
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const eventId = request.nextUrl.searchParams.get('event_id');

    // Get bookings from last 30 days forward
    const past30 = new Date();
    past30.setDate(past30.getDate() - 30);
    const pastStr = `${past30.getFullYear()}-${String(past30.getMonth() + 1).padStart(2, '0')}-${String(past30.getDate()).padStart(2, '0')}`;

    let query = supabase
      .from('event_bookings')
      .select('*')
      .gte('event_date', pastStr)
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error }, 'Failed to fetch event bookings');
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Enrich with event titles
    const eventIds = [...new Set((data || []).map(b => b.event_id))];
    let eventMap = new Map<string, { title: string; max_capacity: number | null }>();

    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from('events')
        .select('id, title, max_capacity')
        .in('id', eventIds);

      eventMap = new Map((events || []).map(e => [e.id, { title: e.title, max_capacity: e.max_capacity }]));
    }

    const enriched = (data || []).map(b => ({
      ...b,
      event_title: eventMap.get(b.event_id)?.title || 'Event',
      event_max_capacity: eventMap.get(b.event_id)?.max_capacity || null,
    }));

    return NextResponse.json({ bookings: enriched });
  } catch (error) {
    logger.error({ error }, 'Event bookings route error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
