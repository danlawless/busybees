/**
 * API Route: Group Child Detail
 * PATCH - Update child details or sign waiver
 * DELETE - Remove child from group
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateChildSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  waiver_signed: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; childId: string }> }
) {
  try {
    const { id: groupId, childId } = await params;
    const body = await request.json();
    const parsed = UpdateChildSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Build update object
    const update: Record<string, unknown> = {};
    if (parsed.data.name) update.name = parsed.data.name.trim();
    if (parsed.data.birthdate) update.birthdate = parsed.data.birthdate;
    if (parsed.data.waiver_signed !== undefined) {
      update.waiver_signed = parsed.data.waiver_signed;
      update.waiver_signed_date = parsed.data.waiver_signed ? new Date().toISOString() : null;
    }

    const { data: child, error } = await supabase
      .from('children')
      .update(update)
      .eq('id', childId)
      .eq('customer_id', groupId)
      .select()
      .single();

    if (error || !child) {
      logger.error({ error, groupId, childId }, 'Failed to update group child');
      return NextResponse.json({ error: 'Child not found or update failed' }, { status: 404 });
    }

    logger.info({ groupId, childId, updates: Object.keys(update) }, 'Group child updated');

    return NextResponse.json({ success: true, child });
  } catch (error) {
    logger.error({ error }, 'Group child update error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; childId: string }> }
) {
  try {
    const { id: groupId, childId } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', childId)
      .eq('customer_id', groupId);

    if (error) {
      logger.error({ error, groupId, childId }, 'Failed to delete group child');
      return NextResponse.json({ error: 'Failed to remove child' }, { status: 500 });
    }

    logger.info({ groupId, childId }, 'Child removed from group');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Group child delete error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
