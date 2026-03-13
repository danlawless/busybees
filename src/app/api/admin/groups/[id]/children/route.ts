/**
 * API Route: Group Children Management
 * GET - List all children in a group
 * POST - Add a child to the group (max 30)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const MAX_GROUP_CHILDREN = 30;

const AddChildSchema = z.object({
  name: z.string().min(1, 'Child name is required').max(200),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be YYYY-MM-DD'),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const supabase = createAdminClient();

    // Verify this is a group account
    const { data: group, error: groupError } = await supabase
      .from('users')
      .select('id, group_name, is_group')
      .eq('id', groupId)
      .eq('is_group', true)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id, name, birthdate, waiver_signed, waiver_signed_date, created_at')
      .eq('customer_id', groupId)
      .order('name', { ascending: true });

    if (childrenError) {
      logger.error({ error: childrenError, groupId }, 'Failed to fetch group children');
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }

    return NextResponse.json({ children: children || [] });
  } catch (error) {
    logger.error({ error }, 'Group children fetch error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const body = await request.json();
    const parsed = AddChildSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify this is a group account
    const { data: group } = await supabase
      .from('users')
      .select('id, is_group')
      .eq('id', groupId)
      .eq('is_group', true)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check child count limit
    const { count } = await supabase
      .from('children')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', groupId);

    if ((count || 0) >= MAX_GROUP_CHILDREN) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_GROUP_CHILDREN} children per group` },
        { status: 400 }
      );
    }

    const { data: child, error: insertError } = await supabase
      .from('children')
      .insert({
        customer_id: groupId,
        name: parsed.data.name.trim(),
        birthdate: parsed.data.birthdate,
        waiver_signed: false,
      })
      .select()
      .single();

    if (insertError) {
      logger.error({ error: insertError, groupId }, 'Failed to add child to group');
      return NextResponse.json({ error: 'Failed to add child' }, { status: 500 });
    }

    logger.info({ groupId, childId: child.id, childName: child.name }, 'Child added to group');

    return NextResponse.json({ success: true, child }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Group add child error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
