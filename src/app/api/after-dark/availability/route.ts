/**
 * Public API: After Dark event availability
 * GET ?date=YYYY-MM-DD - Get spots remaining for a specific date
 * GET (no date) - Get availability for all upcoming Fridays
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const MAX_KIDS = 40;

function getUpcomingFridays(count: number): string[] {
  const fridays: string[] = [];
  const d = new Date();
  const dayOfWeek = d.getDay();
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6;
  d.setDate(d.getDate() + daysUntilFriday);

  for (let i = 0; i < count; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    fridays.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 7);
  }
  return fridays;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const date = request.nextUrl.searchParams.get('date');

    if (date) {
      // Single date availability
      const { data, error } = await supabase
        .from('after_dark_bookings')
        .select('num_kids')
        .eq('event_date', date)
        .neq('status', 'cancelled');

      if (error) {
        return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
      }

      const booked = (data || []).reduce((sum, b) => sum + b.num_kids, 0);

      return NextResponse.json({
        date,
        maxKids: MAX_KIDS,
        booked,
        remaining: Math.max(0, MAX_KIDS - booked),
        isFull: booked >= MAX_KIDS,
      });
    }

    // All upcoming Fridays availability
    const fridays = getUpcomingFridays(8);

    const { data, error } = await supabase
      .from('after_dark_bookings')
      .select('event_date, num_kids')
      .in('event_date', fridays)
      .neq('status', 'cancelled');

    if (error) {
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
    }

    // Sum kids per date
    const bookedByDate: Record<string, number> = {};
    (data || []).forEach(b => {
      bookedByDate[b.event_date] = (bookedByDate[b.event_date] || 0) + b.num_kids;
    });

    const availability = fridays.map(date => {
      const booked = bookedByDate[date] || 0;
      return {
        date,
        maxKids: MAX_KIDS,
        booked,
        remaining: Math.max(0, MAX_KIDS - booked),
        isFull: booked >= MAX_KIDS,
      };
    });

    return NextResponse.json({ availability });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
