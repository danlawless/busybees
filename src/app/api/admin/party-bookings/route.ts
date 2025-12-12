/**
 * Admin Party Bookings API
 * GET /api/admin/party-bookings - List all bookings with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['admin', 'staff'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const partyType = searchParams.get('partyType');
    const searchQuery = searchParams.get('search');

    // Build query
    let query = supabase
      .from('party_bookings')
      .select('*')
      .order('party_date', { ascending: false })
      .order('start_time', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('party_date', startDate);
    }

    if (endDate) {
      query = query.lte('party_date', endDate);
    }

    if (partyType && partyType !== 'all') {
      query = query.eq('party_type', partyType);
    }

    if (searchQuery) {
      query = query.or(
        `customer_name.ilike.%${searchQuery}%,customer_email.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%,child_name.ilike.%${searchQuery}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error }, 'Failed to fetch party bookings');
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    logger.info({ count: data?.length || 0, filters: { status, startDate, endDate, partyType } }, 'Fetched party bookings');

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error({ error }, 'Unexpected error fetching party bookings');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
