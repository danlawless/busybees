/**
 * API Route: Admin Sign Waiver for Child
 * POST - Mark waiver as signed for a child
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; childId: string }> }
) {
  try {
    const { id: customerId, childId } = await params;

    logger.info({ customerId, childId }, '✍️ Signing waiver for child');

    const supabase = createAdminClient();

    // Update child waiver status
    const { data: child, error } = await supabase
      .from('children')
      .update({
        waiver_signed: true,
        waiver_signed_date: new Date().toISOString(),
      })
      .eq('id', childId)
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      logger.error({ error, customerId, childId }, 'Failed to sign waiver');
      return NextResponse.json({ error: 'Failed to sign waiver' }, { status: 500 });
    }

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    logger.info({ customerId, childId }, '✅ Waiver signed successfully');
    return NextResponse.json({ child });
  } catch (error) {
    logger.error({ error }, 'Failed to sign waiver');
    return NextResponse.json({ error: 'Failed to sign waiver' }, { status: 500 });
  }
}
