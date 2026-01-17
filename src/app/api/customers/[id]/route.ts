/**
 * API Route: Customer by ID
 * GET - Get customer details
 * PUT - Update customer
 * DELETE - Delete customer
 */

import { NextRequest, NextResponse } from 'next/server';
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

/**
 * DELETE - Delete customer
 * Uses admin client (service role) to bypass RLS since POS staff
 * authentication is PIN-based rather than Supabase session-based.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    logger.info({ customerId: id }, '🗑️ Deleting customer');

    await deleteCustomer(id);

    logger.info({ customerId: id }, '✅ Customer deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error deleting customer');
    return NextResponse.json(
      { error: 'Failed to delete customer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

