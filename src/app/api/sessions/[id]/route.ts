/**
 * API Route: Session by ID
 * PUT - End a session (check-out)
 *
 * Note: POS staff access is controlled via PIN at the application level.
 */

import { NextRequest, NextResponse } from 'next/server';
import { endSession, voidSession } from '@/lib/services/sessions';

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
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Note: POS staff access is controlled via PIN at the application level
    const { id } = await params;
    await voidSession(id);

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

