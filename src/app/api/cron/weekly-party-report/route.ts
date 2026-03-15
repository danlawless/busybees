/**
 * Cron Route: Weekly Party Booking Report
 * Runs every Monday at 10:00 AM EST (15:00 UTC)
 * Sends an email to info@busybeesipc.com with upcoming weekend party details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

const PACKAGE_LABELS: Record<string, string> = {
  queen_bee: 'Queen Bee',
  worker_bee: 'Worker Bee',
  basic_bee: 'Basic Bee',
};

const PARTY_TYPE_LABELS: Record<string, string> = {
  private: 'Private Party',
  semi_private: 'Semi-Private Party',
};

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getUpcomingWeekendDates(): { saturday: string; sunday: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7; // Next Saturday
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + daysUntilSaturday);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  const format = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { saturday: format(saturday), sunday: format(sunday) };
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
    const { saturday, sunday } = getUpcomingWeekendDates();

    // Fetch bookings for the upcoming weekend
    const { data: bookings, error } = await supabase
      .from('party_bookings')
      .select('*')
      .in('party_date', [saturday, sunday])
      .neq('status', 'cancelled')
      .order('party_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      logger.error({ error }, 'Failed to fetch weekend party bookings');
      return NextResponse.json({ success: false, error: 'Failed to fetch bookings' }, { status: 500 });
    }

    const saturdayBookings = (bookings || []).filter(b => b.party_date === saturday);
    const sundayBookings = (bookings || []).filter(b => b.party_date === sunday);
    const totalBookings = (bookings || []).length;

    // Build email HTML
    const buildBookingRow = (booking: Record<string, string | number | null>) => `
      <tr>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
          <strong>${booking.customer_name}</strong><br>
          <span style="color: #6b7280;">${booking.customer_email}</span><br>
          <span style="color: #6b7280;">${booking.customer_phone}</span>
        </td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
          ${formatTime(String(booking.start_time))} - ${formatTime(String(booking.end_time))}
        </td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
          ${PACKAGE_LABELS[String(booking.package_name)] || booking.package_name}<br>
          <span style="color: #6b7280; font-size: 12px;">${PARTY_TYPE_LABELS[String(booking.party_type)] || booking.party_type}</span>
        </td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
          ${booking.child_name}${booking.child_age ? ` (${booking.child_age} yrs)` : ''}
        </td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
          ${booking.guest_count} guests<br>
          <span style="color: #6b7280; font-size: 12px;">$${Number(booking.total_price).toFixed(2)}</span>
        </td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; ${
            booking.status === 'confirmed'
              ? 'background-color: #dcfce7; color: #166534;'
              : 'background-color: #fef9c3; color: #854d0e;'
          }">${String(booking.status).toUpperCase()}</span>
        </td>
      </tr>
      ${booking.notes ? `
      <tr>
        <td colspan="6" style="padding: 4px 15px 12px; border-bottom: 1px solid #d1d5db; font-size: 13px; color: #6b7280;">
          <em>Notes: ${booking.notes}</em>
        </td>
      </tr>` : ''}
    `;

    const buildDaySection = (dateStr: string, dayBookings: Record<string, string | number | null>[]) => {
      if (dayBookings.length === 0) {
        return `
          <div style="margin-bottom: 30px;">
            <h2 style="font-size: 20px; color: #1f2937; margin: 0 0 10px; padding-bottom: 8px; border-bottom: 2px solid #f59e0b;">
              ${formatDate(dateStr)}
            </h2>
            <p style="color: #6b7280; font-style: italic;">No party bookings scheduled.</p>
          </div>
        `;
      }

      return `
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 20px; color: #1f2937; margin: 0 0 15px; padding-bottom: 8px; border-bottom: 2px solid #f59e0b;">
            ${formatDate(dateStr)} — ${dayBookings.length} ${dayBookings.length === 1 ? 'Party' : 'Parties'}
          </h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 10px 15px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Contact</th>
                <th style="padding: 10px 15px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Time</th>
                <th style="padding: 10px 15px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Package</th>
                <th style="padding: 10px 15px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Birthday Child</th>
                <th style="padding: 10px 15px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Details</th>
                <th style="padding: 10px 15px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${dayBookings.map(buildBookingRow).join('')}
            </tbody>
          </table>
        </div>
      `;
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekend Party Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 800px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <div style="width: 60px; height: 60px; background-color: #fef3c7; border-radius: 50%; margin: 0 auto 15px; line-height: 60px;">
          <span style="font-size: 30px;">🎉</span>
        </div>
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
          Weekend Party Report
        </h1>
        <p style="margin: 8px 0 0; color: #fef3c7; font-size: 14px;">
          ${totalBookings} ${totalBookings === 1 ? 'party' : 'parties'} booked this weekend
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #ffffff; padding: 30px 25px; border-radius: 0 0 12px 12px;">
        ${buildDaySection(saturday, saturdayBookings)}
        ${buildDaySection(sunday, sundayBookings)}
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="font-size: 13px; color: #9ca3af; margin: 0;">
            This report was automatically generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} EST
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `Weekend Party Report\n\n${totalBookings} parties booked this weekend.\n\n` +
      (bookings || []).map(b =>
        `${formatDate(b.party_date)}\n` +
        `  Customer: ${b.customer_name} (${b.customer_email}, ${b.customer_phone})\n` +
        `  Time: ${formatTime(b.start_time)} - ${formatTime(b.end_time)}\n` +
        `  Package: ${PACKAGE_LABELS[b.package_name] || b.package_name} (${PARTY_TYPE_LABELS[b.party_type] || b.party_type})\n` +
        `  Birthday Child: ${b.child_name}${b.child_age ? ` (${b.child_age} yrs)` : ''}\n` +
        `  Guests: ${b.guest_count} | Total: $${Number(b.total_price).toFixed(2)}\n` +
        `  Status: ${b.status}\n` +
        (b.notes ? `  Notes: ${b.notes}\n` : '')
      ).join('\n');

    // Send the email
    const result = await sendEmail({
      to: 'info@busybeesipc.com',
      subject: `Weekend Party Report — ${totalBookings} ${totalBookings === 1 ? 'Party' : 'Parties'} (${formatDate(saturday).split(',')[0]} & ${formatDate(sunday).split(',')[0]})`,
      text: textContent,
      html,
    });

    if (!result.success) {
      logger.error({ error: result.error }, 'Failed to send weekly party report email');
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    logger.info({ totalBookings, saturday, sunday }, 'Weekly party report sent');

    return NextResponse.json({
      success: true,
      message: 'Weekly party report sent',
      totalBookings,
      saturday,
      sunday,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Weekly party report cron error');
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
