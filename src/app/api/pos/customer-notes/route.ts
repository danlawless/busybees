/**
 * POS Customer Notes API Route
 * Returns a customer's staff notes for the check-in header.
 *
 * Staff/admin only — these notes (e.g. account flags, fraud warnings) must
 * never be exposed to a customer, so unlike the gift-card balance route this
 * does NOT let a customer read their own notes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Staff/admin only.
    const { data: requester } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!requester || !['staff', 'admin'].includes(requester.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
