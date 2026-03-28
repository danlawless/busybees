/**
 * Public Event Detail API
 * GET /api/events/[id] - Fetch event detail with linked passes and availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminSupabase = createAdminClient();

    // Fetch event
    const { data: event, error } = await adminSupabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch linked passes if bookable
    let passes: Array<{ id: string; name: string; price: number; category: string; description: string | null }> = [];
    if (event.is_bookable && event.pass_ids && event.pass_ids.length > 0) {
      const { data: passData } = await adminSupabase
        .from('passes')
        .select('id, name, price, category, description')
        .in('id', event.pass_ids)
        .eq('is_active', true);

      passes = passData || [];
    }

    // Calculate availability
    let booked = 0;
    let remaining: number | null = null;

    if (event.is_bookable && event.max_capacity) {
      const { data: bookings } = await adminSupabase
        .from('event_bookings')
        .select('num_children')
        .eq('event_id', id)
        .neq('status', 'cancelled');

      booked = (bookings || []).reduce((sum, b) => sum + b.num_children, 0);
      remaining = event.max_capacity - booked;
    }

    return NextResponse.json({
      event,
      passes,
      availability: {
        booked,
        remaining,
        maxCapacity: event.max_capacity,
        isFull: remaining !== null && remaining <= 0,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch event detail');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
