/**
 * API Route: Party Guest by ID
 * PATCH - Update guest (sign waiver)
 * DELETE - Remove guest from guest list
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  try {
    const { id: bookingId, guestId } = await params;
    const supabase = createAdminClient();
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.waiver_signed !== undefined) {
      updates.waiver_signed = body.waiver_signed;
      if (body.waiver_signed) {
        updates.waiver_signed_date = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from('party_guests')
      .update(updates)
      .eq('id', guestId)
      .eq('booking_id', bookingId);

    if (error) {
      logger.error({ error, bookingId, guestId }, 'Failed to update party guest');
      return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Party guest update error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  try {
    const { id: bookingId, guestId } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('party_guests')
      .delete()
      .eq('id', guestId)
      .eq('booking_id', bookingId);

    if (error) {
      logger.error({ error, bookingId, guestId }, 'Failed to delete party guest');
      return NextResponse.json({ error: 'Failed to remove guest' }, { status: 500 });
    }

    logger.info({ bookingId, guestId }, 'Party guest removed');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Party guest delete error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
