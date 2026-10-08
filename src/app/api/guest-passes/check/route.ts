/**
 * Is this phone number's family eligible for a guest pass? Answers for the
 * counter only (approved POS device or staff), throttled, because it reveals
 * whether a number belongs to a customer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { beginAttempt, clientAddress, TOO_MANY_ATTEMPTS } from '@/lib/auth/throttle';
import { CONFLICT_MESSAGE, NOT_ELIGIBLE_MESSAGE } from '@/lib/guestPasses/rules';
import { getGuestAccountChildren, resolveGuestEligibility } from '@/lib/guestPasses/server';
import { logger } from '@/lib/logger';
import { guestPassCaller } from '../callerGuard';

const checkSchema = z.object({
  member_id: z.string().uuid().optional(),
  phone: z
    .string()
    .transform((p) => p.replace(/[^\d]/g, ''))
    .refine((p) => p.length === 10, 'Enter a 10-digit phone number'),
});

export async function POST(request: NextRequest) {
  const parsed = checkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }
  const who = await guestPassCaller(request, parsed.data.member_id ?? null);
  if ('response' in who) return who.response;

  const attempt = await beginAttempt('guest-lookup', clientAddress(request), { skipOverall: true });
  if (!attempt.allowed) return NextResponse.json({ error: TOO_MANY_ATTEMPTS }, { status: 429 });

  try {
    // Same decision as issuing, including the children already on an empty
    // account, so the counter hears "not eligible" before filling anything in.
    const eligibility = await resolveGuestEligibility({ phone: parsed.data.phone });
    switch (eligibility.kind) {
      case 'new':
        return NextResponse.json({ kind: 'new' });
      case 'not_eligible':
        return NextResponse.json({ kind: 'not_eligible', message: NOT_ELIGIBLE_MESSAGE });
      case 'conflict':
        return NextResponse.json({ kind: 'conflict', message: CONFLICT_MESSAGE });
      case 'existing': {
        const { data: user } = await createAdminClient()
          .from('users')
          .select('name')
          .eq('id', eligibility.userId)
          .single();
        return NextResponse.json({
          kind: 'existing',
          parentName: user?.name ?? '',
          children: await getGuestAccountChildren(eligibility.userId),
        });
      }
    }
  } catch (error) {
    logger.error({ error }, 'Guest pass check failed');
    return NextResponse.json({ error: 'Could not check that number. Please try again.' }, { status: 500 });
  }
}
