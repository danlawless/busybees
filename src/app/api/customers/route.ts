/**
 * API Route: Customers
 * GET - List all customers (staff only)
 * POST - Create a new customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllCustomers, createCustomer } from '@/lib/services/customers';
import { requireStaff } from '@/lib/auth/requireRole';
import { z } from 'zod';

const newCustomerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  email: z.string().trim().email().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is staff/admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customers = await getAllCustomers();
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Inserts a users row with the service role -- including its role -- so it
  // must never be open: an anonymous caller could create themselves an admin.
  const denied = await requireStaff();
  if (denied) return denied;

  try {
    const parsed = newCustomerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid customer' },
        { status: 400 }
      );
    }
    // Always a customer: never a role, password hash or Stripe id from the body.
    const customer = await createCustomer({ ...parsed.data, role: 'customer' });
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

