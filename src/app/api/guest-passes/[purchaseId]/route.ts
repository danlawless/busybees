/**
 * Undo a guest check-in made by mistake: the $0 purchase and its open session
 * are removed, the member gets the pass back, and the friend stays eligible.
 * Same callers as issuing (the sponsoring member on the POS device, or staff).
 * A visit that has already ended cannot be undone.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGuestPassSponsor, voidGuestPassRpc } from '@/lib/guestPasses/server';
import { logger } from '@/lib/logger';
import { guestPassCaller } from '../callerGuard';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ purchaseId: string }> }) {
  const id = z.string().uuid().safeParse((await params).purchaseId);
  if (!id.success) return NextResponse.json({ error: 'Invalid guest pass id' }, { status: 400 });

  try {
    const sponsor = await getGuestPassSponsor(id.data);
    if (!sponsor) return NextResponse.json({ error: 'Guest pass not found' }, { status: 404 });

    const who = await guestPassCaller(request, sponsor);
    if ('response' in who) return who.response;

    const result = await voidGuestPassRpc(id.data);
    if (!result.ok) {
      return result.reason === 'visit_ended'
        ? NextResponse.json({ error: 'This visit has already ended and cannot be undone.' }, { status: 400 })
        : NextResponse.json({ error: 'Guest pass not found' }, { status: 404 });
    }
    logger.info({ purchaseId: id.data, sponsor }, 'Guest pass voided');
    return NextResponse.json({ voided: true });
  } catch (error) {
    logger.error({ error }, 'Guest pass undo failed');
    return NextResponse.json({ error: 'Could not undo the guest pass.' }, { status: 500 });
  }
}
