/**
 * API Route: Admin Customer Child by ID
 * PATCH - Update child details
 * DELETE - Remove child
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; childId: string }> }
) {
  try {
    const { id: customerId, childId } = await params;
    const body = await request.json();
    const { name, birthdate } = body;

    logger.info({ customerId, childId, updates: body }, '📝 Updating child');

    const supabase = createAdminClient();

    // Build update object
    const updates: Record<string, string> = {};
    if (name) updates.name = name;
    if (birthdate) updates.birthdate = birthdate;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update child
    const { data: child, error } = await supabase
      .from('children')
      .update(updates)
      .eq('id', childId)
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      logger.error({ error, customerId, childId }, 'Failed to update child');
      return NextResponse.json({ error: 'Failed to update child' }, { status: 500 });
    }

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    logger.info({ customerId, childId }, '✅ Child updated successfully');
    return NextResponse.json({ child });
  } catch (error) {
    logger.error({ error }, 'Failed to update child');
    return NextResponse.json({ error: 'Failed to update child' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; childId: string }> }
) {
  try {
    const { id: customerId, childId } = await params;

    logger.info({ customerId, childId }, '🗑️ Deleting child');

    const supabase = createAdminClient();

    // Check if child has any active passes
    const { data: activePurchases } = await supabase
      .from('purchases')
      .select('id')
      .eq('child_id', childId)
      .eq('status', 'active')
      .limit(1);

    if (activePurchases && activePurchases.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete child with active passes' },
        { status: 400 }
      );
    }

    // Delete child
    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', childId)
      .eq('customer_id', customerId);

    if (error) {
      logger.error({ error, customerId, childId }, 'Failed to delete child');
      return NextResponse.json({ error: 'Failed to delete child' }, { status: 500 });
    }

    logger.info({ customerId, childId }, '✅ Child deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete child');
    return NextResponse.json({ error: 'Failed to delete child' }, { status: 500 });
  }
}
