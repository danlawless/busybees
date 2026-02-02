/**
 * Admin Party Booking API
 * PATCH /api/admin/party-bookings/[id] - Update booking status and details
 * DELETE /api/admin/party-bookings/[id] - Permanently delete a booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'done']).optional(),
  notes: z.string().optional(),
  party_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication and admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['admin', 'staff'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateBookingSchema.parse(body);

    // Update booking using admin client (bypass RLS)
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
      logger.error({ error, bookingId: id }, 'Failed to update party booking');
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }

    logger.info({ bookingId: id, updates: validatedData, adminEmail: user.email }, 'Updated party booking');

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['admin', 'staff'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

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

    logger.info({ bookingId: id, adminEmail: user.email }, 'Deleted party booking');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Unexpected error deleting party booking');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
