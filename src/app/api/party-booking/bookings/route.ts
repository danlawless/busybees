/**
 * Public API Route: Get Party Bookings for Calendar
 * Returns minimal booking info (date, time, status) for calendar display
 * Does not expose customer details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBookingsForDateRangePublic } from '@/lib/services/party-bookings';
import { formatDateToYYYYMMDD } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Default to current month if no dates provided
    const today = new Date();
    const defaultStart = formatDateToYYYYMMDD(new Date(today.getFullYear(), today.getMonth(), 1));
    const defaultEnd = formatDateToYYYYMMDD(new Date(today.getFullYear(), today.getMonth() + 2, 0));

    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Get ALL bookings for the date range (bypasses RLS for availability display)
    // This ensures customers can see all booked slots, not just their own
    const bookings = await getBookingsForDateRangePublic(start, end);

    // Transform to minimal format for calendar display (no customer details)
    const calendarBookings = bookings.map((booking) => ({
      id: booking.id,
      date: booking.party_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      duration: 2,
      partyType: booking.party_type,
      status: booking.status,
      // Don't expose customer info in public API
      customerName: 'Reserved',
      customerPhone: '',
      customerEmail: '',
      guestCount: booking.guest_count,
      totalPrice: 0, // Don't expose pricing
      createdAt: booking.created_at,
    }));

    return NextResponse.json({
      success: true,
      bookings: calendarBookings,
    });
  } catch (error) {
    console.error('Error fetching bookings for calendar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
