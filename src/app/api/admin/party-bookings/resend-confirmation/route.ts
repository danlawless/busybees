/**
 * API Route: Resend Party Booking Confirmation Email
 * POST - Resend confirmation email for a specific booking (staff/admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendPartyBookingConfirmationEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: userData } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Staff only' }, { status: 403 });
    }

    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId required' }, { status: 400 });
    }

    // Fetch booking
    const { data: booking, error } = await adminSupabase
      .from('party_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!booking.customer_email) {
      return NextResponse.json({ error: 'No customer email on this booking' }, { status: 400 });
    }

    const result = await sendPartyBookingConfirmationEmail({
      to: booking.customer_email,
      customerName: booking.customer_name || 'Valued Customer',
      customerPhone: booking.customer_phone,
      childName: booking.child_name,
      partyDate: booking.party_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      packageName: booking.package_name,
      guestCount: booking.guest_count,
      totalPrice: Number(booking.total_price),
      bookingId: booking.id,
      partyType: booking.party_type,
    });

    if (result.success) {
      logger.info({ bookingId, to: booking.customer_email }, 'Party confirmation email resent');
      return NextResponse.json({ success: true, to: booking.customer_email });
    } else {
      logger.error({ bookingId, error: result.error }, 'Failed to resend party confirmation email');
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }
  } catch (error) {
    logger.error({ error }, 'Resend confirmation error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
