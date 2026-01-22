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

    // Convert to array format for response
    const groupedSlots = Array.from(bookedSlotsByDate.entries()).map(([date, times]) => ({
      date,
      times,
    }));

    return NextResponse.json({
      success: true,
      bookedSlots: groupedSlots,
      totalBookings: bookedSlots?.length || 0,
    });
  } catch (error) {
    console.error('Availability check error:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
