import { NextRequest, NextResponse } from 'next/server';
import { hashPin, verifyPin } from '@/lib/auth/pin';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminLevel } from '@/lib/admin/guard';
import { loadPinHashes } from '@/lib/admin/shared-accounts';
import { validatePinChange } from '@/lib/admin/pin-change';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  if ((await getAdminLevel()) !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  const pin = typeof body?.pin === 'string' ? body.pin : '';

  // Format check first, so we only load hashes for well-formed requests.
  if (validatePinChange(kind, pin, false) === 'invalid') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  try {
    const hashes = await loadPinHashes();
    const otherHash = kind === 'admin' ? hashes.staff : hashes.admin;
    const otherMatches = otherHash ? await verifyPin(pin, otherHash) : false;
    if (validatePinChange(kind, pin, otherMatches) === 'same-as-other') {
      return NextResponse.json({ error: 'same-as-other' }, { status: 400 });
    }

    const { error } = await createAdminClient()
      .from('settings')
      .upsert({ key: `${kind}_pin_hash`, value: await hashPin(pin), description: `bcrypt hash of the ${kind} PIN` }, { onConflict: 'key' });
    if (error) throw error;
  } catch (error) {
    logger.error({ error, kind }, 'PIN update failed');
    return NextResponse.json({ error: 'save-failed' }, { status: 500 });
  }
  logger.info({ kind }, 'PIN updated');
  return NextResponse.json({ ok: true });
}
