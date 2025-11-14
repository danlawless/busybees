/**
 * API Route: Child by ID
 * GET - Get child details
 * PUT - Update child
 * DELETE - Delete child
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getChild, updateChild, deleteChild, signWaiver } from '@/lib/services/children';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const child = await getChild(id);

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
    const body = await request.json();

    // Special handling for waiver signing
    if (body.sign_waiver) {
      const child = await signWaiver(id);
      return NextResponse.json(child);
    }

    const child = await updateChild(id, body);
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


