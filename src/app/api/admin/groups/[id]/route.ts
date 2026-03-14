/**
 * API Route: Admin Group by ID
 * DELETE - Delete a group account and all its children
 *
 * Uses admin client to bypass RLS since POS staff auth is PIN-based.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

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
