/**
 * Party Booking Availability API Route
 * Returns available time slots for a date range
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBookingsForDateRange } from '@/lib/services/party-bookings';

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

    // Get all bookings for the date range
    const bookings = await getBookingsForDateRange(startDate, endDate);

    // Group bookings by date and extract booked times
    const bookedSlotsByDate = new Map<string, string[]>();

    bookings.forEach((booking) => {
      const date = booking.party_date;
      const times = bookedSlotsByDate.get(date) || [];
      times.push(booking.start_time);
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
