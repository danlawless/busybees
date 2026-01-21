/**
 * Admin Party Time Slots API - Individual Slot Operations
 * PATCH /api/admin/party-time-slots/[id] - Update a time slot
 * DELETE /api/admin/party-time-slots/[id] - Delete a time slot
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Validation schema for updating a time slot
const UpdateTimeSlotSchema = z.object({
  partyType: z.enum(['private', 'semi_private']).optional(),
  dayType: z.enum(['weekday', 'weekend']).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
  label: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateTimeSlotSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const updates = validation.data;

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (updates.partyType !== undefined) updateData.party_type = updates.partyType;
    if (updates.dayType !== undefined) updateData.day_type = updates.dayType;
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update time slot
    const { data, error } = await supabase
      .from('party_time_slots')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A time slot with these settings already exists' },
          { status: 409 }
        );
      }
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
      }
      logger.error({ error, id }, 'Failed to update party time slot');
      return NextResponse.json({ error: 'Failed to update time slot' }, { status: 500 });
    }

    logger.info({ slotId: id, updates: updateData }, 'Updated party time slot');

    return NextResponse.json(data);
  } catch (error) {
    logger.error({ error }, 'Unexpected error updating party time slot');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Delete time slot
    const { error } = await supabase.from('party_time_slots').delete().eq('id', id);

    if (error) {
      logger.error({ error, id }, 'Failed to delete party time slot');
      return NextResponse.json({ error: 'Failed to delete time slot' }, { status: 500 });
    }

    logger.info({ slotId: id }, 'Deleted party time slot');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Unexpected error deleting party time slot');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
