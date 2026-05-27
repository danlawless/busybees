/**
 * Admin Party Time Slots API
 * GET /api/admin/party-time-slots - List all time slots
 * POST /api/admin/party-time-slots - Create a new time slot
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

// Validation schema for creating a time slot
const CreateTimeSlotSchema = z
  .object({
    partyType: z.enum(['private', 'semi_private']),
    dayType: z.enum(['weekday', 'weekend']),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
    label: z.string().min(1).max(50),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.number().optional().default(0),
    effectiveStartDate: dateString.nullable().optional(),
    effectiveEndDate: dateString.nullable().optional(),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  })
  .refine(
    (data) =>
      (data.effectiveStartDate ?? null) === null
        ? (data.effectiveEndDate ?? null) === null
        : (data.effectiveEndDate ?? null) !== null,
    { message: 'effectiveStartDate and effectiveEndDate must be provided together' }
  )
  .refine(
    (data) =>
      !data.effectiveStartDate ||
      !data.effectiveEndDate ||
      data.effectiveEndDate >= data.effectiveStartDate,
    { message: 'effectiveEndDate must be on or after effectiveStartDate' }
  )
  .refine(
    (data) => {
      if (data.dayOfWeek === null || data.dayOfWeek === undefined) return true;
      const isWeekendDow = data.dayOfWeek === 0 || data.dayOfWeek === 6;
      return data.dayType === 'weekend' ? isWeekendDow : !isWeekendDow;
    },
    { message: 'dayOfWeek does not match dayType (weekend: 0|6, weekday: 1-5)' }
  );

export async function GET() {
  try {
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

    // Fetch all time slots
    const { data, error } = await supabase
      .from('party_time_slots')
      .select('*')
      .order('party_type', { ascending: true })
      .order('day_type', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      logger.error({ error }, 'Failed to fetch party time slots');
      return NextResponse.json({ error: 'Failed to fetch time slots' }, { status: 500 });
    }

    logger.info({ count: data?.length || 0 }, 'Fetched party time slots');

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error({ error }, 'Unexpected error fetching party time slots');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateTimeSlotSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const {
      partyType,
      dayType,
      startTime,
      endTime,
      label,
      isActive,
      sortOrder,
      effectiveStartDate,
      effectiveEndDate,
      dayOfWeek,
    } = validation.data;

    // Insert time slot
    const { data, error } = await supabase
      .from('party_time_slots')
      .insert({
        party_type: partyType,
        day_type: dayType,
        start_time: startTime,
        end_time: endTime,
        label,
        is_active: isActive,
        sort_order: sortOrder,
        effective_start_date: effectiveStartDate ?? null,
        effective_end_date: effectiveEndDate ?? null,
        day_of_week: dayOfWeek ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { error: 'A time slot with these settings already exists' },
          { status: 409 }
        );
      }
      logger.error({ error }, 'Failed to create party time slot');
      return NextResponse.json({ error: 'Failed to create time slot' }, { status: 500 });
    }

    logger.info({ slotId: data.id, partyType, dayType }, 'Created party time slot');

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Unexpected error creating party time slot');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
