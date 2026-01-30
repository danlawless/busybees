/**
 * API Route: Newsletter Email Config Check
 * GET - Check if Resend email service is properly configured
 */

import { NextResponse } from 'next/server';
import { isEmailServiceConfigured } from '@/lib/email/resend';

export async function GET() {
  const configured = isEmailServiceConfigured();

  return NextResponse.json({
    emailConfigured: configured,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'Busy Bees Indoor Play Center <noreply@busybeesipc.com>',
  });
}
