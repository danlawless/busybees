/**
 * POS Access PIN — verification
 * POST { pin } -> { valid: boolean, configured: boolean }
 *
 * Used by the /pos lock screen. Only returns a boolean; the PIN itself is
 * never sent to the client. A correct PIN also approves this device for the
 * phone-only kiosk sign-in (see lib/auth/posDevice) for 30 days or until the
 * PIN changes. Wrong guesses are limited (lib/auth/throttle), since a 4-6
 * digit PIN would otherwise fall to a script.
 *
 * If no PIN is configured, the lock screen stays open (valid: true,
 * configured: false), but no device is approved: kiosk phone sign-in then
 * needs a staff member signed in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { approveDevice } from '@/lib/auth/posDevice';
import { checkThrottle, clientAddress, recordAttempt, TOO_MANY_ATTEMPTS } from '@/lib/auth/throttle';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    const supabase = createAdminClient();
    const { data: setting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'pos_access_pin')
      .maybeSingle();

    const configured = Boolean(setting?.value);
    if (!configured) {
      // No PIN set — POS is open.
      return NextResponse.json({ valid: true, configured: false });
    }

    const ip = clientAddress(request);
    if (!(await checkThrottle('pos-pin', ip))) {
      return NextResponse.json({ valid: false, configured: true, error: TOO_MANY_ATTEMPTS }, { status: 429 });
    }

    const valid = typeof pin === 'string' && pin === String(setting!.value);
    await recordAttempt('pos-pin', ip, valid);

    const response = NextResponse.json({ valid, configured: true });
    if (valid) approveDevice(response, pin);
    return response;
  } catch (error) {
    logger.error({ error }, 'Failed to verify POS PIN');
    return NextResponse.json({ valid: false, configured: true }, { status: 500 });
  }
}
