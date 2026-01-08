/**
 * API Route: Admin Customer Children
 * POST - Add a new child to customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params;
    const body = await request.json();
    const { name, birthdate } = body;

    logger.info({ customerId, name, birthdate }, '👶 Adding child to customer');

    if (!name || !birthdate) {
      return NextResponse.json(
        { error: 'Name and birthdate are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('users')
      .select('id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Create child
    const { data: child, error } = await supabase
      .from('children')
      .insert({
        customer_id: customerId,
        name,
        birthdate,
        waiver_signed: false,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, customerId }, 'Failed to create child');
      return NextResponse.json({ error: 'Failed to create child' }, { status: 500 });
    }

    logger.info({ customerId, childId: child.id }, '✅ Child added successfully');
    return NextResponse.json({ child });
  } catch (error) {
    logger.error({ error }, 'Failed to add child');
    return NextResponse.json({ error: 'Failed to add child' }, { status: 500 });
  }
}
