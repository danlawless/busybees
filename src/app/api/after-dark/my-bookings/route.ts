/**
 * API: Get logged-in customer's After Dark bookings
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { todayStr as getTodayStr } from '@/lib/services/report-aggregations';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ bookings: [] });
    }

    const adminSupabase = createAdminClient();
    const todayStr = getTodayStr();

    const { data, error } = await adminSupabase
      .from('after_dark_bookings')
      .select('id, event_date, num_kids, kid_details, status')
      .eq('parent_email', user.email)
      .gte('event_date', todayStr)
      .neq('status', 'cancelled')
      .order('event_date', { ascending: true });

    if (error) {
      return NextResponse.json({ bookings: [] });
    }

    return NextResponse.json({ bookings: data || [] });
  } catch {
    return NextResponse.json({ bookings: [] });
  }
}
