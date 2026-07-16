/**
 * POS Access PIN — verification
 * POST { pin } -> { valid: boolean, configured: boolean }
 *
 * Used by the /pos lock screen. Matches the POS architecture (admin client,
 * no user session — like /api/pos/customers). Only returns a boolean; the PIN
 * itself is never sent to the client. If no PIN is configured, the POS is not
 * locked (valid: true, configured: false).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

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

    const valid = typeof pin === 'string' && pin === setting!.value;
    return NextResponse.json({ valid, configured: true });
  } catch (error) {
    logger.error({ error }, 'Failed to verify POS PIN');
    return NextResponse.json({ valid: false, configured: true }, { status: 500 });
  }
}
