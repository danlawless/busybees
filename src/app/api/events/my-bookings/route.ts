/**
 * Customer Event Bookings API
 * GET /api/events/my-bookings - Fetch current user's event bookings
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ bookings: [] });
    }

    const adminSupabase = createAdminClient();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { data, error } = await adminSupabase
      .from('event_bookings')
      .select('id, event_id, event_date, num_children, child_details, status, total_amount, notes')
      .eq('customer_id', user.id)
      .gte('event_date', todayStr)
      .neq('status', 'cancelled')
      .order('event_date', { ascending: true });

    if (error) {
      return NextResponse.json({ bookings: [] });
    }

    // Enrich with event titles
    const eventIds = [...new Set((data || []).map(b => b.event_id))];
    let eventMap = new Map<string, string>();

    if (eventIds.length > 0) {
      const { data: events } = await adminSupabase
        .from('events')
        .select('id, title')
        .in('id', eventIds);

      eventMap = new Map((events || []).map(e => [e.id, e.title]));
    }

    const enriched = (data || []).map(b => ({
      ...b,
      event_title: eventMap.get(b.event_id) || 'Event',
    }));

    return NextResponse.json({ bookings: enriched });
  } catch {
    return NextResponse.json({ bookings: [] });
  }
}
