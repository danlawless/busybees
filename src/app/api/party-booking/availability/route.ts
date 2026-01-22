/**
 * Party Booking Availability API Route
 * Returns available time slots for a date range
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBookingsForDateRange } from '@/lib/services/party-bookings';

/**
 * Normalize time to HH:MM format for consistent comparison
 * PostgreSQL TIME can return HH:MM:SS, we normalize to HH:MM
 */
function normalizeTime(time: string): string {
  // Handle HH:MM:SS format - extract just HH:MM
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

    // Get all bookings for the date range (uses admin client to see all bookings)
    const bookings = await getBookingsForDateRange(startDate, endDate);

    // Group bookings by date and extract booked times (normalized to HH:MM)
    const bookedSlotsByDate = new Map<string, string[]>();

    bookings.forEach((booking) => {
      const date = booking.party_date;
      const times = bookedSlotsByDate.get(date) || [];
      // Normalize time format for consistent comparison with time slots
      times.push(normalizeTime(booking.start_time));
      bookedSlotsByDate.set(date, times);
    });

    // Convert to array format for response
    const bookedSlots = Array.from(bookedSlotsByDate.entries()).map(([date, times]) => ({
      date,
      times,
    }));

    return NextResponse.json({
      success: true,
      bookedSlots,
      totalBookings: bookings.length,
    });
  } catch (error) {
    console.error('Availability check error:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
