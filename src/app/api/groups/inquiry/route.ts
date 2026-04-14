/**
 * API Route: Group Play Inquiry Form
 * POST - Sends a group inquiry email to info@busybeesipc.com
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const InquirySchema = z.object({
  contactName: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7).max(20),
  groupName: z.string().min(2).max(100),
  anticipatedDate: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = InquirySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please fill in all required fields.' },
        { status: 400 }
      );
    }

    const { contactName, contactEmail, contactPhone, groupName, anticipatedDate, notes } = parsed.data;

    const subject = `🏫 Group Play Inquiry from ${groupName}`;

    const text = `
New Group Play Inquiry

Contact Name: ${contactName}
Contact Email: ${contactEmail}
Contact Phone: ${contactPhone}
Group Name: ${groupName}
Anticipated Date of Visit: ${anticipatedDate}
${notes ? `Additional Notes: ${notes}` : ''}
`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f0e1;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f0e1; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background-color: #d97706; padding: 24px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px;">🏫 Group Play Inquiry</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Contact Name</td><td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600;">${contactName}</td></tr>
                <tr><td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Email</td><td style="padding: 8px 0; font-size: 14px; color: #111827;"><a href="mailto:${contactEmail}" style="color: #d97706;">${contactEmail}</a></td></tr>
                <tr><td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Phone</td><td style="padding: 8px 0; font-size: 14px; color: #111827;">${contactPhone}</td></tr>
                <tr><td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Group Name</td><td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600;">${groupName}</td></tr>
                <tr><td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Anticipated Date</td><td style="padding: 8px 0; font-size: 14px; color: #111827;">${anticipatedDate}</td></tr>
                ${notes ? `<tr><td colspan="2" style="padding: 12px 0 0;"><p style="font-size: 14px; color: #6b7280; margin: 0 0 4px;">Additional Notes</p><p style="font-size: 14px; color: #111827; margin: 0; background: #f9fafb; padding: 12px; border-radius: 8px;">${notes}</p></td></tr>` : ''}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const result = await sendEmail({
      to: 'info@busybeesipc.com',
      subject,
      text,
      html,
      replyTo: contactEmail,
    });

    if (result.success) {
      logger.info({ groupName, contactEmail }, '📧 Group inquiry email sent');
      return NextResponse.json({ success: true });
    } else {
      logger.error({ error: result.error }, 'Failed to send group inquiry email');
      return NextResponse.json({ error: 'Failed to send inquiry' }, { status: 500 });
    }
  } catch (error) {
    logger.error({ error }, 'Group inquiry error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
