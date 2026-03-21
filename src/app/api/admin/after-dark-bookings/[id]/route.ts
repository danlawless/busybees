/**
 * Admin API: After Dark Booking by ID
 * PUT - Update booking (status, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateBookingSchema = z.object({
  status: z.enum(['confirmed', 'cancelled']).optional(),
  notes: z.string().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('after_dark_bookings')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to update After Dark booking');
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }

    return NextResponse.json({ booking: data });
  } catch (error) {
    logger.error({ error }, 'After Dark booking update error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
