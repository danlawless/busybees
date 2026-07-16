/**
 * POS Access PIN — configuration
 * GET  -> { configured: boolean }            (never returns the PIN itself)
 * POST { pin, currentPin? } -> { success }   (set/change the POS access PIN)
 *
 * Lives with the other POS settings endpoints (admin client, matching the POS
 * architecture). Changing an existing PIN requires the current PIN, so it can't
 * be silently overwritten. Setting the first PIN is allowed (bootstrap).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const PIN_KEY = 'pos_access_pin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', PIN_KEY)
      .maybeSingle();

    return NextResponse.json({ configured: Boolean(data?.value) });
  } catch (error) {
    logger.error({ error }, 'Failed to read POS PIN state');
    return NextResponse.json({ error: 'Failed to read setting' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { pin, currentPin } = await request.json();

    // Validate the new PIN: 4–6 digits. Empty string clears/disables the lock.
    const newPin = typeof pin === 'string' ? pin.trim() : '';
    const clearing = newPin === '';
    if (!clearing && !/^\d{4,6}$/.test(newPin)) {
      return NextResponse.json(
        { error: 'PIN must be 4 to 6 digits.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('settings')
      .select('value')
      .eq('key', PIN_KEY)
      .maybeSingle();

    // If a PIN already exists, require the current one to change or clear it.
    if (existing?.value) {
      if (typeof currentPin !== 'string' || currentPin !== existing.value) {
        return NextResponse.json(
          { error: 'Current PIN is incorrect.' },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase
      .from('settings')
      .upsert({ key: PIN_KEY, value: newPin }, { onConflict: 'key' });

    if (error) {
      logger.error({ error }, 'Failed to save POS PIN');
      return NextResponse.json({ error: 'Failed to save PIN' }, { status: 500 });
    }

    return NextResponse.json({ success: true, configured: !clearing });
  } catch (error) {
    logger.error({ error }, 'Failed to update POS PIN');
    return NextResponse.json({ error: 'Failed to update PIN' }, { status: 500 });
  }
}
