/**
 * Admin Party Booking API
 * PATCH /api/admin/party-bookings/[id] - Update booking status and details
 * DELETE /api/admin/party-bookings/[id] - Permanently delete a booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'done']).optional(),
  notes: z.string().optional(),
  party_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  child_name: z.string().min(1).max(100).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateBookingSchema.parse(body);

    // Use admin client to bypass RLS (POS staff auth is PIN-based)
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('party_bookings')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ error, bookingId: id, code: error.code, details: error.details, hint: error.hint, message: error.message }, 'Failed to update party booking');
      return NextResponse.json({ error: 'Failed to update booking', details: error.message, code: error.code, hint: error.hint }, { status: 500 });
    }

    logger.info({ bookingId: id, updates: validatedData }, 'Updated party booking');

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }

    logger.error({ error }, 'Unexpected error updating party booking');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Use admin client to bypass RLS (POS staff auth is PIN-based)
    const adminSupabase = createAdminClient();

    // Delete linked purchase first to avoid FK constraint
    const { data: booking } = await adminSupabase
      .from('party_bookings')
      .select('purchase_id')
      .eq('id', id)
      .single();

    if (booking?.purchase_id) {
      await adminSupabase
        .from('purchases')
        .delete()
        .eq('id', booking.purchase_id);
    }

    const { error } = await adminSupabase
      .from('party_bookings')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ error, bookingId: id }, 'Failed to delete party booking');
      return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
    }

    logger.info({ bookingId: id }, 'Deleted party booking');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Unexpected error deleting party booking');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
