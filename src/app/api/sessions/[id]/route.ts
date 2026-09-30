/**
 * API Route: Session by ID
 * PUT    - End a session (check-out)
 * DELETE - Undo a check-in (staff/admin only)
 *
 * DELETE requires a staff session because it refunds a punch. PUT deliberately
 * does not: checking out costs nothing, and nobody should be stuck inside
 * because the front desk cannot log in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { endSession, voidSession } from '@/lib/services/sessions';
import { requireStaff } from '../requireStaff';

const sessionIdSchema = z.string().uuid();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Note: POS staff access is controlled via PIN at the application level
    const { id } = await params;
    const session = await endSession(id);

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error ending session:', error);
    return NextResponse.json(
      { error: 'Failed to end session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Undo a check-in.
 *
 * Distinct from check-out: this gives the punch back. Only a session that has
 * not ended can be voided, so it cannot be used to reverse a completed visit.
 *
 * Requires a staff/admin session. This refunds a punch and destroys a record
 * of who is in the building, and it takes nothing but a session id -- ids that
 * `GET /api/pos/customers` hands out. The POS PIN is a client-side screen lock
 * and proves nothing to the server.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireStaff();
    if (denied) return denied;

    const { id } = await params;
    const parsedId = sessionIdSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
    }
    await voidSession(parsedId.data);

    return NextResponse.json({ voided: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_ALREADY_ENDED') {
      return NextResponse.json(
        { error: 'This visit has already ended and cannot be undone.' },
        { status: 400 }
      );
    }
    console.error('Error voiding session:', error);
    return NextResponse.json(
      {
        error: 'Failed to undo check-in',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

