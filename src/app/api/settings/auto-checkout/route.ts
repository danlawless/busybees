/**
 * Auto-Checkout Settings API
 * GET - Get current timezone and closing time settings
 * POST - Update timezone and/or closing time (protected by staff mode PIN on frontend)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAutoCheckoutSettings,
  setClosingTime,
  setTimezone
} from '@/lib/services/auto-checkout-settings';

export async function GET() {
  try {
    const settings = await getAutoCheckoutSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching auto-checkout settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auto-checkout settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Note: This endpoint is protected by staff mode PIN authentication on the frontend.
    // The POS admin panel requires PIN entry before accessing settings.
    const body = await request.json();
    const { timezone, closingTime } = body;

    // Update timezone if provided
    if (timezone !== undefined) {
      if (typeof timezone !== 'string' || !timezone.includes('/')) {
        return NextResponse.json(
          { error: 'Invalid timezone format. Use IANA format (e.g., America/New_York)' },
          { status: 400 }
        );
      }
      await setTimezone(timezone);
    }

    // Update closing time if provided
    if (closingTime !== undefined) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(closingTime)) {
        return NextResponse.json(
          { error: 'Invalid time format. Use HH:MM in 24-hour format' },
          { status: 400 }
        );
      }
      await setClosingTime(closingTime);
    }

    // Return updated settings
    const settings = await getAutoCheckoutSettings();
    return NextResponse.json({ success: true, ...settings });
  } catch (error) {
    console.error('Error updating auto-checkout settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to update auto-checkout settings: ${errorMessage}` },
      { status: 500 }
    );
  }
}
