/**
 * API Route: Admin Groups
 * GET - List all group accounts with children counts and waiver status
 * POST - Create a new group account (school, daycare, church group, etc.)
 *
 * Uses admin client to bypass RLS since POS staff auth is PIN-based.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateGroupSchema = z.object({
  group_name: z.string().min(1, 'Group name is required').max(200),
  contact_name: z.string().min(1, 'Contact name is required').max(200),
  phone: z.string().min(10, 'Valid phone number required').max(15),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
});

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch all group accounts
    // Note: is_group and group_name columns require migration 036
    const { data: groups, error: groupsError } = await supabase
      .from('users')
      .select('id, name, phone, email, group_name, is_group, created_at')
      .eq('role', 'customer')
      .eq('is_group', true)
      .order('created_at', { ascending: false });

    if (groupsError) {
      // If is_group column doesn't exist yet, return empty (migration not run)
      if (groupsError.message?.includes('is_group') || groupsError.message?.includes('group_name')) {
        logger.warn({}, 'Groups columns not found — migration 036 may not have been run yet');
        return NextResponse.json({
          groups: [],
          stats: { total: 0, totalChildren: 0, waiversPending: 0 },
          migration_needed: true,
        });
      }
      logger.error({ error: groupsError }, 'Failed to fetch groups');
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }

    if (!groups || groups.length === 0) {
      return NextResponse.json({ groups: [], stats: { total: 0, totalChildren: 0, waiversPending: 0 } });
    }

    // Fetch children for all groups
    const groupIds = groups.map(g => g.id);
    const { data: childrenData, error: childrenError } = await supabase
      .from('children')
      .select('id, customer_id, name, birthdate, waiver_signed')
      .in('customer_id', groupIds);

    if (childrenError) {
      logger.warn({ error: childrenError }, 'Failed to fetch group children');
    }

    const allChildren = childrenData || [];

    // Group children by customer_id
    const childrenByGroup = new Map<string, typeof allChildren>();
    for (const child of allChildren) {
      const existing = childrenByGroup.get(child.customer_id) || [];
      existing.push(child);
      childrenByGroup.set(child.customer_id, existing);
    }

    // Build response
    const formattedGroups = groups.map(group => {
      const children = childrenByGroup.get(group.id) || [];
      const waiversSigned = children.filter(c => c.waiver_signed).length;
      return {
        id: group.id,
        groupName: group.group_name || group.name,
        contactName: group.name,
        phone: group.phone,
        email: group.email,
        childCount: children.length,
        waiversSigned,
        waiversPending: children.length - waiversSigned,
        createdAt: group.created_at,
      };
    });

    const stats = {
      total: formattedGroups.length,
      totalChildren: allChildren.length,
      waiversPending: allChildren.filter(c => !c.waiver_signed).length,
    };

    return NextResponse.json({ groups: formattedGroups, stats });
  } catch (error) {
    logger.error({ error }, 'Groups fetch error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { group_name, contact_name, phone, email } = parsed.data;
    const cleanPhone = phone.replace(/\D/g, '');
    const supabase = createAdminClient();

    // Check for existing account with same phone
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', cleanPhone)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this phone number already exists' },
        { status: 409 }
      );
    }

    // Create auth user first (required for users table FK)
    const authPassword = `PHONE-${cleanPhone}`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email || `group-${cleanPhone}@busybeesipc.com`,
      password: authPassword,
      email_confirm: true,
      user_metadata: {
        name: contact_name,
        phone: cleanPhone,
        role: 'customer',
        is_group: true,
        group_name,
      },
    });

    if (authError || !authData.user) {
      logger.error({ error: authError }, 'Failed to create auth user for group');
      return NextResponse.json(
        { error: authError?.message || 'Failed to create group account' },
        { status: 500 }
      );
    }

    // Create user profile
    const { data: newGroup, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        phone: cleanPhone,
        name: contact_name,
        email: email || null,
        role: 'customer',
        is_group: true,
        group_name,
        has_web_password: false,
      })
      .select('id, name, phone, email, group_name, created_at')
      .single();

    if (insertError) {
      logger.error({ error: insertError, message: insertError.message, code: insertError.code }, 'Failed to insert group user record');
      // Clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      // Return specific error for debugging
      const isColumnMissing = insertError.message?.includes('is_group') || insertError.message?.includes('group_name');
      return NextResponse.json(
        { error: isColumnMissing
          ? 'Migration 036 has not been run yet. The is_group and group_name columns are missing from the database.'
          : insertError.message || 'Failed to create group account'
        },
        { status: 500 }
      );
    }

    logger.info({ groupId: newGroup.id, groupName: group_name }, 'Group account created');

    return NextResponse.json({
      success: true,
      group: {
        id: newGroup.id,
        groupName: newGroup.group_name,
        contactName: newGroup.name,
        phone: newGroup.phone,
        email: newGroup.email,
        childCount: 0,
        waiversSigned: 0,
        waiversPending: 0,
        createdAt: newGroup.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Group creation error');
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
