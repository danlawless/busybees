/**
 * API Route: Customer by ID
 * GET - Get customer details
 * PUT - Update customer
 * DELETE - Delete customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCustomer, updateCustomer, deleteCustomer, getCustomerWithDetails } from '@/lib/services/customers';
import { logger } from '@/lib/logger';
import { requireAdmin, requireStaff } from '@/lib/auth/requireRole';
import { requireAccountAccess } from '@/app/api/sessions/requireAccountAccess';
import { z } from 'zod';

/**
 * What a customer record update may change. Never role, password hashes or
 * Stripe ids: an open version of this route let anyone make themselves admin.
 */
const customerUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email().nullable().optional(),
    phone: z.string().trim().min(7).max(20).optional(),
  })
  .strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const denied = await requireAccountAccess(id);
    if (denied) return denied;

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
    const denied = await requireStaff();
    if (denied) return denied;

    const { id } = await params;
    const parsed = customerUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid update' },
        { status: 400 }
      );
    }

    const customer = await updateCustomer(id, parsed.data);
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
  const denied = await requireAdmin();
  if (denied) return denied;

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

