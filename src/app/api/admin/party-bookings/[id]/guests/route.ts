/**
 * API Route: Party Guest List
 * GET - List all guests for a party booking
 * POST - Add a guest to the guest list
 *
 * Uses admin client to bypass RLS since POS staff auth is PIN-based.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const AddGuestSchema = z.object({
  child_name: z.string().min(1, 'Child name is required').max(200),
  age: z.number().int().min(0).max(18).nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = createAdminClient();

    const { data: guests, error } = await supabase
      .from('party_guests')
      .select('id, child_name, age, waiver_signed, waiver_signed_date, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error({ error, bookingId }, 'Failed to fetch party guests');
      return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 });
    }

    return NextResponse.json({ guests: guests || [] });
  } catch (error) {
    logger.error({ error }, 'Party guests fetch error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = createAdminClient();

    const body = await request.json();
    const parsed = AddGuestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    // Verify booking exists
    const { data: booking, error: bookingError } = await supabase
      .from('party_bookings')
      .select('id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const { data: guest, error: insertError } = await supabase
      .from('party_guests')
      .insert({
        booking_id: bookingId,
        child_name: parsed.data.child_name.trim(),
        age: parsed.data.age ?? null,
      })
      .select()
      .single();

    if (insertError) {
      logger.error({ error: insertError, bookingId }, 'Failed to add party guest');
      return NextResponse.json({ error: 'Failed to add guest' }, { status: 500 });
    }

    logger.info({ bookingId, guestName: parsed.data.child_name }, 'Party guest added');

    return NextResponse.json({ guest });
  } catch (error) {
    logger.error({ error }, 'Party guest add error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
