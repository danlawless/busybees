/**
 * Public Party Time Slots API
 * GET /api/party-booking/time-slots - Get available time slots for a date and party type
 *
 * Query params:
 * - date: YYYY-MM-DD format
 * - partyType: 'private' | 'semi_private'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { TIME_SLOTS, PartyType } from '@/lib/validations/party-booking';

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
      logger.warn({ error }, 'Failed to fetch time slots from database, using defaults');
    }

    // Use database slots if available, otherwise fall back to hardcoded defaults
    let slots: Array<{ startTime: string; endTime: string; label: string }>;

    if (dbSlots && dbSlots.length > 0) {
      slots = dbSlots.map((slot) => ({
        startTime: slot.start_time,
        endTime: slot.end_time,
        label: slot.label,
      }));
    } else {
      // Fall back to hardcoded defaults
      const defaultSlots = isWeekend
        ? TIME_SLOTS[partyType].weekend
        : TIME_SLOTS[partyType].weekday;
      slots = [...defaultSlots];
    }

    logger.info(
      { date: dateStr, partyType, dayType, slotCount: slots.length, source: dbSlots?.length ? 'database' : 'defaults' },
      'Fetched time slots'
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
