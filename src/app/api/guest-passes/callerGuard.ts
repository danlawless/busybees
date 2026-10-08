/**
 * Gathers who is calling and whether this is the store's approved POS device,
 * then lets decideGuestPassCaller (src/lib/guestPasses/rules.ts) decide.
 * Returns the member to act for, or the response to send.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requestHasApprovedDevice, DEVICE_LOCKED_ERROR } from '@/lib/auth/posDevice';
import { decideGuestPassCaller } from '@/lib/guestPasses/rules';
import type { CallerRole } from '@/app/api/sessions/accountAccess';

export async function guestPassCaller(
  request: NextRequest,
  requestedMemberId: string | null
): Promise<{ memberId: string } | { response: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let role: CallerRole | null = null;
  if (user) {
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
    role = data?.role ?? null;
  }

  const decision = decideGuestPassCaller({
    caller: { userId: user?.id ?? null, role },
    deviceApproved: user ? await requestHasApprovedDevice(request) : false,
    requestedMemberId,
  });

  switch (decision.kind) {
    case 'allow':
      return { memberId: decision.memberId };
    case 'unauthenticated':
      return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    case 'device_locked':
      return { response: NextResponse.json({ error: DEVICE_LOCKED_ERROR, code: 'device_locked' }, { status: 403 }) };
    case 'member_required':
      return { response: NextResponse.json({ error: 'member_id is required' }, { status: 400 }) };
    case 'forbidden':
      return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
}
