/**
 * Public Party Time Slots API
 * GET /api/party-booking/time-slots - Get available time slots for a date and party type
 *
 * Query params:
 * - date: YYYY-MM-DD format
 * - partyType: 'private' | 'semi_private'
 *
 * NOTE: Time slots must be configured in the database (party_time_slots table).
 * No fallbacks - if no slots are configured, returns empty array.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { PartyType } from '@/lib/validations/party-booking';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date');
    const partyType = searchParams.get('partyType') as PartyType | null;

    if (!dateStr || !partyType) {
      return NextResponse.json(
        { error: 'Missing required parameters: date and partyType' },
        { status: 400 }
      );
    }

    if (!['private', 'semi_private'].includes(partyType)) {
      return NextResponse.json({ error: 'Invalid partyType' }, { status: 400 });
    }

    // Parse date and determine day type
    const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone issues
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayType = isWeekend ? 'weekend' : 'weekday';

    const supabase = await createClient();

    // Try to fetch from database first
    const { data: dbSlots, error } = await supabase
      .from('party_time_slots')
      .select('start_time, end_time, label')
      .eq('party_type', partyType)
      .eq('day_type', dayType)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      logger.error({ error }, 'Failed to fetch time slots from database');
      return NextResponse.json(
        { error: 'Failed to fetch time slots from database', details: error.message },
        { status: 500 }
      );
    }

    // Database only - no fallbacks
    const slots = (dbSlots || []).map((slot) => ({
      startTime: slot.start_time,
      endTime: slot.end_time,
      label: slot.label,
    }));

    if (slots.length === 0) {
      logger.warn(
        { date: dateStr, partyType, dayType },
        'No time slots configured in database for this date/party type'
      );
    }

    logger.info(
      { date: dateStr, partyType, dayType, slotCount: slots.length },
      'Fetched time slots from database'
    );

    return NextResponse.json({
      date: dateStr,
      partyType,
      dayType,
      slots,
    });
  } catch (error) {
    logger.error({ error }, 'Unexpected error fetching time slots');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
