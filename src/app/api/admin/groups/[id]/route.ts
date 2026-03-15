/**
 * API Route: Admin Group by ID
 * PATCH - Update group contact info
 * DELETE - Delete a group account and all its children
 *
 * Uses admin client to bypass RLS since POS staff auth is PIN-based.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateGroupSchema = z.object({
  group_name: z.string().min(1).max(200).optional(),
  contact_name: z.string().min(1).max(200).optional(),
  phone: z.string().min(1).max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;

  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const parsed = UpdateGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    // Verify group exists
    const { data: group, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', groupId)
      .eq('is_group', true)
      .single();

    if (fetchError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, string> = {};
    if (parsed.data.group_name !== undefined) updates.group_name = parsed.data.group_name;
    if (parsed.data.contact_name !== undefined) updates.name = parsed.data.contact_name;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email || null as unknown as string;

    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', groupId);

    if (updateError) {
      logger.error({ error: updateError, groupId }, 'Failed to update group');
      return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }

    logger.info({ groupId, updates }, 'Group updated');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, groupId }, 'Group update error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;

  try {
    const supabase = createAdminClient();

    // Verify the group exists and is actually a group account
    const { data: group, error: fetchError } = await supabase
      .from('users')
      .select('id, name, group_name, is_group')
      .eq('id', groupId)
      .eq('is_group', true)
      .single();

    if (fetchError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Delete all children under this group
    const { error: childrenError } = await supabase
      .from('children')
      .delete()
      .eq('customer_id', groupId);

    if (childrenError) {
      logger.error({ error: childrenError, groupId }, 'Failed to delete group children');
      return NextResponse.json({ error: 'Failed to delete group children' }, { status: 500 });
    }

    // Delete any purchases for this group
    const { error: purchasesError } = await supabase
      .from('purchases')
      .delete()
      .eq('customer_id', groupId);

    if (purchasesError) {
      logger.warn({ error: purchasesError, groupId }, 'Failed to delete group purchases');
    }

    // Delete the group user record
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', groupId);

    if (userError) {
      logger.error({ error: userError, groupId }, 'Failed to delete group user record');
      return NextResponse.json({ error: 'Failed to delete group account' }, { status: 500 });
    }

    // Delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(groupId);
    if (authError) {
      logger.warn({ error: authError, groupId }, 'Failed to delete group auth user');
    }

    logger.info({ groupId, groupName: group.group_name }, 'Group account deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, groupId }, 'Group deletion error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
