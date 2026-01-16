/**
 * API Route: Customer by ID
 * GET - Get customer details
 * PUT - Update customer
 * DELETE - Delete customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCustomer, updateCustomer, deleteCustomer, getCustomerWithDetails } from '@/lib/services/customers';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';

    const customer = includeDetails
      ? await getCustomerWithDetails(id)
      : await getCustomer(id);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    logger.error({ error }, 'Error fetching customer');
    return NextResponse.json(
      { error: 'Failed to fetch customer', details: error instanceof Error ? error.message : 'Unknown error' },
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

    const customer = await updateCustomer(id, body);
    return NextResponse.json(customer);
  } catch (error) {
    logger.error({ error }, 'Error updating customer');
    return NextResponse.json(
      { error: 'Failed to update customer', details: error instanceof Error ? error.message : 'Unknown error' },
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

    // Only admin can delete customers
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await deleteCustomer(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error deleting customer');
    return NextResponse.json(
      { error: 'Failed to delete customer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

