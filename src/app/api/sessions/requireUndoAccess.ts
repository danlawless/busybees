/**
 * Gate for `DELETE /api/sessions/{id}`: staff, or the front desk on a looked-up
 * customer's own check-in with the POS PIN. The decision itself lives in
 * `undoAccess.ts`; this only gathers its inputs.
 *
 * The PIN travels in the `X-POS-PIN` header. It is compared server-side and
 * never echoed back. Wrong PINs are logged so repeated guessing shows up.
 *
 * Returns the response to send when the caller may not undo, or null to
 * continue.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { decideUndoAccess } from './undoAccess';
import type { CallerRole } from './accountAccess';

export async function requireUndoAccess(
  request: NextRequest,
  sessionId: string
): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: CallerRole | null = null;
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    role = userData?.role ?? null;
  }

  const admin = createAdminClient();
  const [{ data: session }, { data: setting }] = await Promise.all([
    admin.from('sessions').select('customer_id').eq('id', sessionId).maybeSingle(),
    admin.from('settings').select('value').eq('key', 'pos_access_pin').maybeSingle(),
  ]);

  const decision = decideUndoAccess({
    caller: { userId: user?.id ?? null, role },
    sessionOwnerId: session?.customer_id ?? null,
    configuredPin: typeof setting?.value === 'string' ? setting.value : null,
    suppliedPin: request.headers.get('x-pos-pin'),
  });

  switch (decision) {
    case 'allow':
      return null;
    case 'unauthenticated':
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    case 'pin_required':
      return NextResponse.json({ error: 'Staff PIN required to undo a check-in.' }, { status: 403 });
    case 'wrong_pin':
      logger.warn({ sessionId, userId: user?.id }, 'Undo check-in refused: wrong POS PIN');
      return NextResponse.json({ error: 'Incorrect staff PIN.' }, { status: 403 });
    case 'forbidden':
      return NextResponse.json({ error: 'Forbidden - Staff only' }, { status: 403 });
  }
}
