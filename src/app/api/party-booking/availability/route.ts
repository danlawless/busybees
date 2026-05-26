/**
 * Party Booking Availability API Route
 * Returns booked time slots for a date range using a secure Postgres function.
 * The function uses SECURITY DEFINER to bypass RLS and returns only
 * non-sensitive data (dates and times) - no PII is exposed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Normalize time to HH:MM format for consistent comparison
 * PostgreSQL TIME can return HH:MM:SS, we normalize to HH:MM
 */
function normalizeTime(time: string): string {
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return time;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Call the SECURITY DEFINER function that bypasses RLS
    // but only returns non-sensitive data (dates and times)
    const { data: bookedSlots, error } = await supabase.rpc('get_booked_party_slots', {
      start_date: startDate,
      end_date: endDate,
    });

    if (error) {
      console.error('Error fetching booked slots:', error);
      return NextResponse.json(
        { error: 'Failed to check availability' },
        { status: 500 }
      );
    }

    // Group by date and normalize times
    const bookedSlotsByDate = new Map<string, string[]>();

    (bookedSlots || []).forEach((slot: { party_date: string; start_time: string }) => {
      const date = slot.party_date;
      const times = bookedSlotsByDate.get(date) || [];
      times.push(normalizeTime(slot.start_time));
      bookedSlotsByDate.set(date, times);
    });

    // Fetch total default slot counts per day type (weekend vs weekday) for
    // private parties. Defaults exclude date-range overrides + day-of-week pins.
    const { data: weekendSlots } = await supabase
      .from('party_time_slots')
      .select('id')
      .eq('party_type', 'private')
      .eq('day_type', 'weekend')
      .eq('is_active', true)
      .is('effective_start_date', null)
      .is('day_of_week', null);

    const { data: weekdaySlots } = await supabase
      .from('party_time_slots')
      .select('id')
      .eq('party_type', 'private')
      .eq('day_type', 'weekday')
      .eq('is_active', true)
      .is('effective_start_date', null)
      .is('day_of_week', null);

    const totalSlots = {
      weekend: weekendSlots?.length || 0,
      weekday: weekdaySlots?.length || 0,
    };

    // Build per-date override map: for each date in the requested range that
    // falls inside an active date-range slot, return the count of override
    // slots that match that date's day_type + day_of_week (across all party
    // types — the override fully hides defaults).
    const { data: rangeSlots } = await supabase
      .from('party_time_slots')
      .select('day_type, day_of_week, effective_start_date, effective_end_date')
      .eq('is_active', true)
      .not('effective_start_date', 'is', null)
      .lte('effective_start_date', endDate)
      .gte('effective_end_date', startDate);

    const dateOverrides: Record<string, number> = {};
    if (rangeSlots && rangeSlots.length > 0) {
      const cursor = new Date(startDate + 'T12:00:00');
      const stop = new Date(endDate + 'T12:00:00');
      while (cursor <= stop) {
        const iso = cursor.toISOString().slice(0, 10);
        const dow = cursor.getDay();
        const dayType = dow === 0 || dow === 6 ? 'weekend' : 'weekday';
        const matching = rangeSlots.filter(
          (s) =>
            s.effective_start_date !== null &&
            s.effective_end_date !== null &&
            s.effective_start_date <= iso &&
            s.effective_end_date >= iso
        );
        if (matching.length > 0) {
          // Override active for this date — count slots that apply today
          dateOverrides[iso] = matching.filter(
            (s) =>
              s.day_type === dayType &&
              (s.day_of_week === null || s.day_of_week === dow)
          ).length;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // Convert to array format for response
    const groupedSlots = Array.from(bookedSlotsByDate.entries()).map(([date, times]) => ({
      date,
      times,
    }));

    return NextResponse.json({
      success: true,
      bookedSlots: groupedSlots,
      totalBookings: bookedSlots?.length || 0,
      totalSlots,
      dateOverrides,
    });
  } catch (error) {
    console.error('Availability check error:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
