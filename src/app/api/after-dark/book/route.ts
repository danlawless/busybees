/**
 * Public API: Book After Dark event
 * POST - Create a booking (checks capacity before confirming)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { sendAfterDarkBookingEmail } from '@/lib/email/resend';
import { z } from 'zod';

const MAX_KIDS = 40;

const BookingSchema = z.object({
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  parent_name: z.string().min(1).max(200),
  parent_email: z.string().email(),
  parent_phone: z.string().min(7).max(20),
  num_kids: z.number().int().min(1).max(10),
  kid_details: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { event_date, num_kids } = parsed.data;

    // Check current capacity
    const { data: existing, error: countError } = await supabase
      .from('after_dark_bookings')
      .select('num_kids')
      .eq('event_date', event_date)
      .neq('status', 'cancelled');

    if (countError) {
      logger.error({ error: countError }, 'Failed to check After Dark capacity');
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
    }

    const currentBooked = (existing || []).reduce((sum, b) => sum + b.num_kids, 0);
    const remaining = MAX_KIDS - currentBooked;

    if (num_kids > remaining) {
      return NextResponse.json({
        error: remaining === 0
          ? 'Sorry, this event is fully booked!'
          : `Only ${remaining} spot${remaining === 1 ? '' : 's'} remaining. Please reduce the number of kids.`,
        remaining,
      }, { status: 400 });
    }

    // Create booking
    const { data, error } = await supabase
      .from('after_dark_bookings')
      .insert({
        event_date: parsed.data.event_date,
        parent_name: parsed.data.parent_name,
        parent_email: parsed.data.parent_email,
        parent_phone: parsed.data.parent_phone,
        num_kids: parsed.data.num_kids,
        kid_details: parsed.data.kid_details || null,
        notes: parsed.data.notes || null,
        status: 'confirmed',
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create After Dark booking');
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    logger.info({ bookingId: data.id, event_date, num_kids }, 'After Dark booking created');

    // Notify the business of the new booking. Non-blocking: a failed
    // notification must never prevent a confirmed booking from succeeding.
    try {
      const emailResult = await sendAfterDarkBookingEmail({
        eventDate: parsed.data.event_date,
        parentName: parsed.data.parent_name,
        parentEmail: parsed.data.parent_email,
        parentPhone: parsed.data.parent_phone,
        numKids: parsed.data.num_kids,
        kidDetails: parsed.data.kid_details,
        notes: parsed.data.notes,
        remainingSpots: remaining - num_kids,
      });
      if (!emailResult.success) {
        logger.error(
          { error: emailResult.error, bookingId: data.id },
          'Failed to send After Dark booking notification email'
        );
      }
    } catch (emailError) {
      logger.error(
        { error: emailError, bookingId: data.id },
        'After Dark booking notification email threw'
      );
    }

    return NextResponse.json({
      booking: data,
      remaining: remaining - num_kids,
    }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'After Dark booking error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
