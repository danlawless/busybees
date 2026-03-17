/**
 * API: Submit After Dark drop-off waiver
 * POST - Save waiver and mark booking as waiver_signed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const WaiverSchema = z.object({
  booking_id: z.string().uuid(),
  parent_name: z.string().min(1),
  parent_email: z.string().email(),
  parent_phone: z.string().min(1),
  child_names: z.string().min(1),
  emergency_contact_name: z.string().min(1),
  emergency_contact_phone: z.string().min(1),
  emergency_contact_relationship: z.string().min(1),
  authorized_pickup: z.string().min(1),
  allergies: z.string().optional().default(''),
  medical_conditions: z.string().optional().default(''),
  photo_consent: z.boolean(),
  signature: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = WaiverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Save waiver
    const { error: waiverError } = await adminSupabase
      .from('after_dark_waivers')
      .insert({
        booking_id: parsed.data.booking_id,
        parent_name: parsed.data.parent_name,
        parent_email: parsed.data.parent_email,
        parent_phone: parsed.data.parent_phone,
        child_names: parsed.data.child_names,
        emergency_contact_name: parsed.data.emergency_contact_name,
        emergency_contact_phone: parsed.data.emergency_contact_phone,
        emergency_contact_relationship: parsed.data.emergency_contact_relationship,
        authorized_pickup: parsed.data.authorized_pickup,
        allergies: parsed.data.allergies || null,
        medical_conditions: parsed.data.medical_conditions || null,
        photo_consent: parsed.data.photo_consent,
        signature: parsed.data.signature,
        signed_at: new Date().toISOString(),
      });

    if (waiverError) {
      logger.error({ error: waiverError }, 'Failed to save After Dark waiver');
      return NextResponse.json({ error: 'Failed to save waiver' }, { status: 500 });
    }

    // Mark booking as waiver signed
    await adminSupabase
      .from('after_dark_bookings')
      .update({ waiver_signed: true, updated_at: new Date().toISOString() })
      .eq('id', parsed.data.booking_id);

    logger.info({ bookingId: parsed.data.booking_id }, 'After Dark waiver signed');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'After Dark waiver error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
