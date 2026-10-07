/**
 * Member guest passes.
 * GET  - a member's allowance and today's guests (My Account, POS).
 * POST - check a new family's child in on a guest pass (POS only).
 *
 * The POS is signed in AS the member, and the guest pass is written to the
 * FRIEND's account, so this route cannot use the usual own-account gate. It
 * authorizes the caller (callerGuard), re-matches the friend from scratch on
 * the server, and leaves counting + inserting to issue_guest_pass, which locks
 * the membership row. The request never names a price, a membership, or an
 * existing friend account id.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAccountAccess } from '@/app/api/sessions/requireAccountAccess';
import { beginAttempt, clientAddress, TOO_MANY_ATTEMPTS } from '@/lib/auth/throttle';
import { createPosCustomer } from '@/lib/auth/createPosCustomer';
import { createChild } from '@/lib/services/children';
import { getAutoCheckoutSettings } from '@/lib/services/auto-checkout-settings';
import { getNextClosingTime } from '@/lib/utils/timeUtils';
import { logger } from '@/lib/logger';
import {
  CONFLICT_MESSAGE,
  NOT_ELIGIBLE_MESSAGE,
  decideGuestEligibility,
  guestPassesOpen,
  issueRefusalMessage,
  normalizeChildName,
} from '@/lib/guestPasses/rules';
import {
  findGuestMatches,
  getGuestAccountChildren,
  getGuestPassStatus,
  issueGuestPassRpc,
  signChildWaiver,
} from '@/lib/guestPasses/server';
import { guestPassCaller } from './callerGuard';

export async function GET(request: NextRequest) {
  const customerId = z.string().uuid().safeParse(request.nextUrl.searchParams.get('customer_id'));
  if (!customerId.success) return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
  const denied = await requireAccountAccess(customerId.data);
  if (denied) return denied;
  try {
    return NextResponse.json(await getGuestPassStatus(customerId.data));
  } catch (error) {
    logger.error({ error }, 'Guest pass status failed');
    return NextResponse.json({ error: 'Failed to load guest passes' }, { status: 500 });
  }
}

const phoneSchema = z
  .string()
  .transform((p) => p.replace(/[^\d]/g, ''))
  .refine((p) => p.length === 10, 'Enter a 10-digit phone number');

const issueSchema = z
  .object({
    member_id: z.string().uuid().optional(),
    phone: phoneSchema,
    parent_name: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email().max(254).optional(),
    child_id: z.string().uuid().optional(),
    child: z
      .object({
        name: z.string().trim().min(1).max(100),
        birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be YYYY-MM-DD'),
      })
      .optional(),
    waiver_agreed: z.literal(true, { message: 'The waiver must be agreed first' }),
  })
  .refine((b) => Boolean(b.child_id) !== Boolean(b.child), 'Pick one child or add one');

async function autoCheckoutTime(): Promise<string> {
  // Same source as the POS (GET /api/settings/auto-checkout), so a guest
  // checks out at the same time as everyone else.
  const { timezone, closingTime } = await getAutoCheckoutSettings();
  return getNextClosingTime(timezone, closingTime);
}

export async function POST(request: NextRequest) {
  const parsed = issueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }
  const body = parsed.data;

  const who = await guestPassCaller(request, body.member_id ?? null);
  if ('response' in who) return who.response;

  if (!guestPassesOpen()) {
    return NextResponse.json({ error: 'Guest passes start on November 1st.' }, { status: 403 });
  }

  const attempt = await beginAttempt('guest-lookup', clientAddress(request), { skipOverall: true });
  if (!attempt.allowed) return NextResponse.json({ error: TOO_MANY_ATTEMPTS }, { status: 429 });

  try {
    const matches = await findGuestMatches({ phone: body.phone, email: body.email, child: body.child });
    const eligibility = decideGuestEligibility(matches);

    let guestId: string;
    switch (eligibility.kind) {
      case 'not_eligible':
        return NextResponse.json({ error: NOT_ELIGIBLE_MESSAGE }, { status: 409 });
      case 'conflict':
        return NextResponse.json({ error: CONFLICT_MESSAGE }, { status: 409 });
      case 'existing':
        guestId = eligibility.userId;
        break;
      case 'new': {
        if (!body.parent_name || !body.email || !body.child) {
          return NextResponse.json({ error: 'Parent name, email and child are required for a new family' }, { status: 400 });
        }
        const created = await createPosCustomer({ phone: body.phone, name: body.parent_name, email: body.email });
        if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status });
        guestId = created.userId;
        break;
      }
    }

    // The child: one already on the friend's account, matched by id or by
    // name + birthdate, or a new one.
    let childId: string | undefined;
    if (body.child_id) {
      // A named child must already be on the friend's account; never sign a
      // waiver for, or check in, a child the match did not find.
      const own = (await getGuestAccountChildren(guestId)).find((c) => c.id === body.child_id);
      if (!own) return NextResponse.json({ error: 'That child is not on this family\'s account' }, { status: 400 });
      childId = own.id;
    }
    if (!childId && body.child) {
      const wanted = normalizeChildName(body.child.name);
      const existing = (await getGuestAccountChildren(guestId)).find(
        (c) => c.birthdate === body.child?.birthdate && normalizeChildName(c.name) === wanted
      );
      childId =
        existing?.id ??
        (await createChild({ customer_id: guestId, name: body.child.name, birthdate: body.child.birthdate, waiver_signed: false })).id;
    }
    if (!childId) return NextResponse.json({ error: 'Pick one child or add one' }, { status: 400 });

    // The parent agreed the waiver at the counter (waiver_agreed: true).
    await signChildWaiver(childId);

    const result = await issueGuestPassRpc({
      memberId: who.memberId,
      guestId,
      childId,
      autoCheckoutTime: await autoCheckoutTime(),
    });
    if (!result.ok) {
      const status = result.reason === 'not_configured' ? 500 : 409;
      return NextResponse.json({ error: issueRefusalMessage(result.reason), reason: result.reason }, { status });
    }

    logger.info({ memberId: who.memberId, guestId, purchaseId: result.purchaseId }, '🐝 Guest pass issued');
    return NextResponse.json(
      { purchaseId: result.purchaseId, sessionId: result.sessionId, remaining: result.remaining },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error }, 'Guest pass issue failed');
    return NextResponse.json({ error: 'Could not issue the guest pass. Please try again.' }, { status: 500 });
  }
}
