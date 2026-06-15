/**
 * Cron Route: Post-Party Thank You Email
 * Runs daily at 10:00 AM EST (15:00 UTC)
 * Sends a thank you email with Google review CTA to customers
 * whose party took place yesterday
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPostPartyThankYouEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { formatDateET } from '@/lib/services/report-aggregations';

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateET(yesterday);
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
    const yesterday = getYesterdayDate();

    // Find confirmed/done bookings from yesterday that haven't been sent a thank you
    const { data: bookings, error } = await supabase
      .from('party_bookings')
      .select('id, customer_name, customer_email, child_name, package_name, status, party_date, start_time, end_time, base_price, total_price, additional_kids_price, party_type')
      .eq('party_date', yesterday)
      .in('status', ['confirmed', 'done'])
      .neq('payment_status', 'refunded');

    if (error) {
      logger.error({ error }, 'Failed to fetch yesterday\'s party bookings');
      return NextResponse.json({ success: false, error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Filter out event bookings (e.g. Easter Egg Hunt) — not birthday parties
    const partyBookings = (bookings || []).filter(booking => {
      const childName = (booking.child_name || '').toLowerCase();
      const packageName = (booking.package_name || '').toLowerCase();
      return !(childName.includes('egg hunt') || childName.includes('easter')
        || packageName.includes('egg hunt') || packageName.includes('easter'));
    });

    if (partyBookings.length === 0) {
      logger.info({ date: yesterday }, 'No parties from yesterday to send thank you emails');
      return NextResponse.json({
        success: true,
        message: 'No parties from yesterday',
        sent: 0,
        markedDone: 0,
        date: yesterday,
      });
    }

    // Auto-mark confirmed parties from yesterday as done
    const confirmedIds = partyBookings.filter(b => b.status === 'confirmed').map(b => b.id);
    let markedDone = 0;

    if (confirmedIds.length > 0) {
      const { error: updateError } = await supabase
        .from('party_bookings')
        .update({ status: 'done' })
        .in('id', confirmedIds);

      if (updateError) {
        logger.error({ error: updateError }, 'Failed to auto-mark parties as done');
      } else {
        markedDone = confirmedIds.length;
        logger.info({ count: markedDone, date: yesterday }, 'Auto-marked parties as done');
      }
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

      // Fetch guests for recap
      const { data: guests } = await supabase
        .from('party_guests')
        .select('child_name, age')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true });

      const PACKAGE_INCLUDED_KIDS: Record<string, number> = { queen_bee: 20, worker_bee: 15, basic_bee: 15 };
      const includedKids = PACKAGE_INCLUDED_KIDS[booking.package_name] ?? 15;

      const result = await sendPostPartyThankYouEmail({
        to: booking.customer_email,
        customerName: booking.customer_name || 'Valued Customer',
        childName: booking.child_name,
        packageName: booking.package_name,
        partyDate: booking.party_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        basePrice: Number(booking.base_price) || Number(booking.total_price) || 0,
        includedKids,
        guests: guests || [],
        extraKidPrice: 15,
        overageCharged: Number(booking.additional_kids_price) || 0,
        partyType: booking.party_type,
      });

      if (result.success) {
        sent++;
        logger.info({ bookingId: booking.id, to: booking.customer_email }, 'Post-party thank you email sent');
      } else {
        failed++;
        errors.push({ email: booking.customer_email, error: result.error || 'Unknown error' });
        logger.error({ bookingId: booking.id, error: result.error }, 'Failed to send post-party thank you email');
      }
    }

    logger.info({ sent, failed, total: partyBookings.length, date: yesterday }, 'Post-party thank you batch complete');

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} thank you email${sent !== 1 ? 's' : ''}, marked ${markedDone} as done`,
      sent,
      failed,
      markedDone,
      total: partyBookings.length,
      date: yesterday,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Post-party thank you cron error');
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
