/**
 * Admin API: After Dark Bookings
 * GET - List all bookings (upcoming and recent past)
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Get bookings from last 30 days forward
    const past30 = new Date();
    past30.setDate(past30.getDate() - 30);
    const pastStr = `${past30.getFullYear()}-${String(past30.getMonth() + 1).padStart(2, '0')}-${String(past30.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('after_dark_bookings')
      .select('*')
      .gte('event_date', pastStr)
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      logger.error({ error }, 'Failed to fetch After Dark bookings');
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    return NextResponse.json({ bookings: data || [] });
  } catch (error) {
    logger.error({ error }, 'After Dark bookings route error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
