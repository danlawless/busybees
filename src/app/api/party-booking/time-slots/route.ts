/**
 * Public Party Time Slots API
 * GET /api/party-booking/time-slots - Get available time slots for a date
 *
 * Query params:
 * - date: YYYY-MM-DD format (required)
 * - partyType: 'private' | 'semi_private' (optional). When omitted, returns
 *   slots for ALL party types (used by preview calendars before the customer
 *   has chosen a type).
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
    const partyTypeParam = searchParams.get('partyType');
    const partyType = (partyTypeParam ?? null) as PartyType | null;

    if (!dateStr) {
      return NextResponse.json(
        { error: 'Missing required parameter: date' },
        { status: 400 }
      );
    }

    if (partyType !== null && !['private', 'semi_private'].includes(partyType)) {
      return NextResponse.json({ error: 'Invalid partyType' }, { status: 400 });
    }

    // Parse date and determine day type
    const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone issues
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayType = isWeekend ? 'weekend' : 'weekday';

    const supabase = await createClient();

    // First, check if this date falls inside any active date-range override
    // (any party_type). If so, that special period suppresses default slots.
    const { data: rangeSlotsForDate, error: rangeError } = await supabase
      .from('party_time_slots')
      .select('start_time, end_time, label, party_type, day_type, day_of_week')
      .eq('is_active', true)
      .not('effective_start_date', 'is', null)
      .lte('effective_start_date', dateStr)
      .gte('effective_end_date', dateStr);

    if (rangeError) {
      logger.error({ error: rangeError }, 'Failed to fetch date-range time slots');
      return NextResponse.json(
        { error: 'Failed to fetch time slots from database', details: rangeError.message },
        { status: 500 }
      );
    }

    const inOverridePeriod = (rangeSlotsForDate?.length ?? 0) > 0;

    let dbSlots: { start_time: string; end_time: string; label: string }[] | null = null;
    let error: { message: string } | null = null;

    if (inOverridePeriod) {
      // Override mode: only show override slots matching this exact date.
      // Filter by partyType only when caller specified one.
      const filtered = (rangeSlotsForDate ?? [])
        .filter(
          (s) =>
            (partyType === null || s.party_type === partyType) &&
            s.day_type === dayType &&
            (s.day_of_week === null || s.day_of_week === dayOfWeek)
        )
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      dbSlots = filtered.map((s) => ({
        start_time: s.start_time,
        end_time: s.end_time,
        label: s.label,
      }));
    } else {
      // Default mode: only slots with no date range and no day-of-week pin
      let query = supabase
        .from('party_time_slots')
        .select('start_time, end_time, label')
        .eq('day_type', dayType)
        .eq('is_active', true)
        .is('effective_start_date', null)
        .is('day_of_week', null);
      if (partyType !== null) {
        query = query.eq('party_type', partyType);
      }
      const result = await query
        .order('sort_order', { ascending: true })
        .order('start_time', { ascending: true });
      dbSlots = result.data;
      error = result.error;
    }

    if (error) {
      logger.error({ error }, 'Failed to fetch time slots from database');
      return NextResponse.json(
        { error: 'Failed to fetch time slots from database', details: error.message },
        { status: 500 }
      );
    }

    // Normalize time to HH:MM format for consistent comparison
    const normalizeTime = (time: string): string => {
      const parts = time.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
      return time;
    };

    // Database only - no fallbacks
    const slots = (dbSlots || []).map((slot) => ({
      startTime: normalizeTime(slot.start_time),
      endTime: normalizeTime(slot.end_time),
      label: slot.label,
    }));

    if (slots.length === 0) {
      logger.warn(
        { date: dateStr, partyType, dayType },
        'No time slots configured in database for this date/party type'
      );
    }

    logger.info(
      { date: dateStr, partyType, dayType, slotCount: slots.length, inOverridePeriod },
      'Fetched time slots from database'
    );

    return NextResponse.json({
      date: dateStr,
      partyType,
      dayType,
      slots,
      inOverridePeriod,
    });
  } catch (error) {
    logger.error({ error }, 'Unexpected error fetching time slots');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
