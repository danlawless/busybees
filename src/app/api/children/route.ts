/**
 * API Route: Children
 * GET - List children for customer
 * POST - Create a new child
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCustomerChildren, createChild } from '@/lib/services/children';

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

    const body = await request.json();

    // Ensure customer_id matches authenticated user (unless staff)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = userData?.role === 'staff' || userData?.role === 'admin';

    if (!isStaff && body.customer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const child = await createChild(body);
    return NextResponse.json(child);
  } catch (error) {
    console.error('Error creating child:', error);
    return NextResponse.json(
      { error: 'Failed to create child', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


