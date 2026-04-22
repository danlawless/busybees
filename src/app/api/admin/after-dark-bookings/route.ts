/**
 * Admin API: After Dark Bookings
 * GET - List all bookings (upcoming and recent past)
 * POST - Create a walk-in booking from the admin UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const MAX_KIDS = 40;
const PRICE_PER_KID = 50;

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Get bookings from last 30 days forward
    const past30 = new Date();
    past30.setDate(past30.getDate() - 30);
    const pastStr = `${past30.getFullYear()}-${String(past30.getMonth() + 1).padStart(2, '0')}-${String(past30.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('after_dark_bookings')
      .select('*')
      .gte('event_date', pastStr)
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      logger.error({ error }, 'Failed to fetch After Dark bookings');
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    return NextResponse.json({ bookings: data || [] });
  } catch (error) {
    logger.error({ error }, 'After Dark bookings route error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const WalkInSchema = z.object({
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  parent_name: z.string().min(1).max(200),
  parent_email: z.string().email().optional().or(z.literal('')),
  parent_phone: z.string().max(20).optional().or(z.literal('')),
  num_kids: z.number().int().min(1).max(10),
  kid_details: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  payment_method: z.enum(['cash', 'card', 'comp']),
  amount_paid: z.number().nonnegative().optional(),
  waiver_signed: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = WalkInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      event_date,
      parent_name,
      parent_email,
      parent_phone,
      num_kids,
      kid_details,
      notes,
      payment_method,
      amount_paid,
      waiver_signed,
    } = parsed.data;

    const supabase = createAdminClient();

    // Check capacity
    const { data: existing, error: countError } = await supabase
      .from('after_dark_bookings')
      .select('num_kids')
      .eq('event_date', event_date)
      .neq('status', 'cancelled');

    if (countError) {
      logger.error({ error: countError }, 'Failed to check After Dark capacity (walk-in)');
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
    }

    const currentBooked = (existing || []).reduce((sum, b) => sum + b.num_kids, 0);
    const remaining = MAX_KIDS - currentBooked;

    if (num_kids > remaining) {
      return NextResponse.json({
        error: remaining === 0
          ? 'Sorry, this event is fully booked!'
          : `Only ${remaining} spot${remaining === 1 ? '' : 's'} remaining.`,
      }, { status: 400 });
    }

    const defaultAmount = payment_method === 'comp' ? 0 : num_kids * PRICE_PER_KID;
    const finalAmount = amount_paid != null ? amount_paid : defaultAmount;

    // Tag walk-in payments so the refund route skips Stripe
    const paymentTag = `walkin_${payment_method}_${Date.now()}`;

    const { data, error } = await supabase
      .from('after_dark_bookings')
      .insert({
        event_date,
        parent_name,
        parent_email: parent_email || '',
        parent_phone: parent_phone || '',
        num_kids,
        kid_details: kid_details || null,
        notes: notes || null,
        status: 'confirmed',
        amount_paid: finalAmount,
        stripe_payment_intent_id: paymentTag,
        waiver_signed: waiver_signed ?? false,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create walk-in After Dark booking');
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    logger.info({
      bookingId: data.id,
      event_date,
      num_kids,
      payment_method,
      amount_paid: finalAmount,
    }, 'After Dark walk-in booking created');

    return NextResponse.json({
      booking: data,
      remaining: remaining - num_kids,
    }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'After Dark walk-in booking error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
