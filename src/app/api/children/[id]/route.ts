/**
 * API Route: Child by ID
 * GET - Get child details
 * PUT - Update child
 * DELETE - Delete child
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getChild, updateChild, deleteChild, signWaiver } from '@/lib/services/children';
import { requireAccountAccess } from '@/app/api/sessions/requireAccountAccess';
import { z } from 'zod';

/**
 * What a PUT may change. Every caller today only signs a waiver; a name or
 * birthdate correction is allowed too. Never the owning account -- that is
 * what every ownership check on passes and payments relies on.
 */
/**
 * Whose child this is, read past row-level security: whether the caller may
 * see or change it is requireAccountAccess's decision, not RLS's (the front
 * desk signs waivers for every family).
 */
async function childOwner(id: string): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from('children')
    .select('customer_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data?.customer_id ?? null;
}

const childUpdateSchema = z.union([
  z.object({ sign_waiver: z.literal(true) }),
  z
    .object({
      name: z.string().trim().min(1).max(100).optional(),
      birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be YYYY-MM-DD').optional(),
    })
    .strict()
    .refine((u) => u.name !== undefined || u.birthdate !== undefined, 'Nothing to update'),
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owner = await childOwner(id);
    if (!owner) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    // Staff, or the parent whose child this is -- no one else.
    const denied = await requireAccountAccess(owner);
    if (denied) return denied;

    const { data: child, error } = await createAdminClient()
      .from('children')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    return NextResponse.json(child);
  } catch (error) {
    console.error('Error fetching child:', error);
    return NextResponse.json(
      { error: 'Failed to fetch child', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const owner = await childOwner(id);
    if (!owner) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    // Staff (the front desk signs waivers), or the parent whose child this is.
    const denied = await requireAccountAccess(owner);
    if (denied) return denied;

    const parsed = childUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid update' },
        { status: 400 }
      );
    }

    if ('sign_waiver' in parsed.data) {
      const child = await signWaiver(id);
      return NextResponse.json(child);
    }

    const child = await updateChild(id, parsed.data);
    return NextResponse.json(child);
  } catch (error) {
    console.error('Error updating child:', error);
    return NextResponse.json(
      { error: 'Failed to update child', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership (customers can only delete their own children)
    const child = await getChild(id);
    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = userData?.role === 'staff' || userData?.role === 'admin';

    if (!isStaff && child.customer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteChild(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting child:', error);
    return NextResponse.json(
      { error: 'Failed to delete child', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


