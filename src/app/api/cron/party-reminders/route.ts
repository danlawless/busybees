/**
 * Cron Route: Party Reminder Email (1 Week Before)
 * Runs daily — sends reminder emails to customers whose party is exactly 7 days away
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPartyReminderEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

function getDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = createAdminClient();
    const targetDate = getDateInDays(7);

    // Find confirmed bookings exactly 7 days from now
    const { data: bookings, error } = await supabase
      .from('party_bookings')
      .select('id, customer_name, customer_email, child_name, package_name, party_date, start_time, end_time, guest_count')
      .eq('party_date', targetDate)
      .in('status', ['confirmed'])
      .neq('payment_status', 'refunded');

    if (error) {
      logger.error({ error }, 'Failed to fetch upcoming party bookings');
      return NextResponse.json({ success: false, error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Filter out event bookings (e.g. Easter Egg Hunt) — these are not birthday parties
    const partyBookings = (bookings || []).filter(booking => {
      const childName = (booking.child_name || '').toLowerCase();
      const packageName = (booking.package_name || '').toLowerCase();
      const isEvent = childName.includes('egg hunt') || childName.includes('easter')
        || packageName.includes('egg hunt') || packageName.includes('easter');
      if (isEvent) {
        logger.info({ bookingId: booking.id, childName: booking.child_name }, 'Skipping event booking (not a birthday party)');
      }
      return !isEvent;
    });

    if (partyBookings.length === 0) {
      logger.info({ date: targetDate }, 'No parties 7 days from now to send reminders');
      return NextResponse.json({
        success: true,
        message: 'No parties to remind',
        sent: 0,
        targetDate,
      });
    }

    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (let i = 0; i < partyBookings.length; i++) {
      const booking = partyBookings[i];

      // Rate limit: wait 600ms between sends
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      if (!booking.customer_email) {
        failed++;
        errors.push({ email: 'unknown', error: `Booking ${booking.id} has no customer email` });
        continue;
      }

      const result = await sendPartyReminderEmail({
        to: booking.customer_email,
        customerName: booking.customer_name || 'Valued Customer',
        childName: booking.child_name,
        partyDate: booking.party_date,
        startTime: formatTime(booking.start_time),
        endTime: formatTime(booking.end_time),
        packageName: booking.package_name,
        guestCount: booking.guest_count,
      });

      if (result.success) {
        sent++;
        logger.info({ bookingId: booking.id, to: booking.customer_email }, 'Party reminder email sent');
      } else {
        failed++;
        errors.push({ email: booking.customer_email, error: result.error || 'Unknown error' });
        logger.error({ bookingId: booking.id, error: result.error }, 'Failed to send party reminder email');
      }
    }

    logger.info({ sent, failed, total: partyBookings.length, targetDate }, 'Party reminder batch complete');

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} reminder${sent !== 1 ? 's' : ''}`,
      sent,
      failed,
      total: partyBookings.length,
      targetDate,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Party reminder cron error');
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
