/**
 * API Route: Newsletter Email Config Check
 * GET - Check if Resend email service is properly configured
 */

import { NextResponse } from 'next/server';
import { isEmailServiceConfigured } from '@/lib/email/resend';
import { requireStaff } from '@/lib/auth/requireRole';

export async function GET() {
  const denied = await requireStaff();
  if (denied) return denied;

  const configured = isEmailServiceConfigured();

  return NextResponse.json({
    emailConfigured: configured,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'Busy Bees Indoor Play Center <noreply@busybeesipc.com>',
  });
}
