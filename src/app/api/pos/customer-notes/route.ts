/**
 * POS Customer Notes API Route
 * Returns a single customer's staff notes for the check-in header.
 *
 * Matches the POS architecture (see /api/pos/customers): the POS runs without
 * a per-user Supabase session, so these routes use the service-role admin
 * client rather than auth.getUser(). This endpoint exposes strictly less than
 * /api/pos/customers, which already returns every customer's notes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('users')
      .select('notes')
      .eq('id', customerId)
      .single();

    if (error) {
      logger.error({ error, customerId }, 'Failed to fetch customer notes');
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    return NextResponse.json({ notes: (data as { notes?: string | null })?.notes ?? null });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch customer notes');
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}
