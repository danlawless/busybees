/**
 * API Route: Send Party Recap Email
 * POST - Sends a recap email to the party host with attendee list and overage charges
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendPartyRecapEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

const PACKAGE_INCLUDED_KIDS: Record<string, number> = {
  queen_bee: 20,
  worker_bee: 15,
  basic_bee: 15,
};
const EXTRA_KID_PRICE = 15;

export async function POST(request: NextRequest) {
  try {
    // Auth check - must be staff/admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data: profile } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['staff', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    // Fetch booking
    const { data: booking, error: bookingError } = await adminSupabase
      .from('party_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!booking.customer_email) {
      return NextResponse.json({ error: 'No email address on file for this booking' }, { status: 400 });
    }

    // Fetch guests
    const { data: guests } = await adminSupabase
      .from('party_guests')
      .select('child_name, age')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    const guestList = guests || [];
    const includedKids = PACKAGE_INCLUDED_KIDS[booking.package_name] ?? 15;
    const overageKids = Math.max(0, guestList.length - includedKids);
    const overageCharged = Number(booking.additional_kids_price) || overageKids * EXTRA_KID_PRICE;

    const result = await sendPartyRecapEmail({
      to: booking.customer_email,
      customerName: booking.customer_name || 'Valued Customer',
      childName: booking.child_name || 'Birthday Child',
      partyDate: booking.party_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      packageName: booking.package_name,
      basePrice: Number(booking.base_price) || Number(booking.total_price) || 0,
      includedKids,
      guests: guestList,
      extraKidPrice: EXTRA_KID_PRICE,
      overageCharged,
    });

    if (result.success) {
      logger.info({ to: booking.customer_email, bookingId }, '📧 Party recap email sent');
      return NextResponse.json({ success: true, to: booking.customer_email });
    } else {
      logger.error({ bookingId, error: result.error }, 'Failed to send party recap email');
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
  } catch (error) {
    logger.error({ error }, 'Error sending party recap email');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
