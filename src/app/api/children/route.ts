/**
 * API Route: Children
 * GET - List children for customer
 * POST - Create a new child
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCustomerChildren, createChild } from '@/lib/services/children';
import { z } from 'zod';

/**
 * A new child, and nothing else. The waiver is always unsigned on creation --
 * it is signed through its own step (PUT sign_waiver), which is what the pass
 * and payment checks rely on.
 */
const newChildSchema = z.object({
  customer_id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Name is required').max(100),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be YYYY-MM-DD'),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    // Customers can only see their own children, staff can see any
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = userData?.role === 'staff' || userData?.role === 'admin';
    const targetCustomerId = isStaff && customerId ? customerId : user.id;

    const children = await getCustomerChildren(targetCustomerId);
    return NextResponse.json(children);
  } catch (error) {
    console.error('Error fetching children:', error);
    return NextResponse.json(
      { error: 'Failed to fetch children', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = newChildSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid child' },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Ensure customer_id matches authenticated user (unless staff)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = userData?.role === 'staff' || userData?.role === 'admin';

    if (!isStaff && body.customer_id && body.customer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const child = await createChild({
      // Default customer_id to authenticated user if not provided
      customer_id: body.customer_id ?? user.id,
      name: body.name,
      birthdate: body.birthdate,
      waiver_signed: false,
    });
    return NextResponse.json(child);
  } catch (error) {
    console.error('Error creating child:', error);
    return NextResponse.json(
      { error: 'Failed to create child', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


