/**
 * API Route: Session by ID
 * PUT - End a session (check-out)
 *
 * Note: POS staff access is controlled via PIN at the application level.
 */

import { NextRequest, NextResponse } from 'next/server';
import { endSession } from '@/lib/services/sessions';

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

