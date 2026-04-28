/**
 * Public API: Get upcoming After Dark movies
 * Returns movies from today forward
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { todayStr as getTodayStr } from '@/lib/services/report-aggregations';

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const supabase = createAdminClient();
    const todayStr = getTodayStr();

    const { data, error } = await supabase
      .from('after_dark_movies')
      .select('id, title, show_date, description, poster_url, rating')
      .gte('show_date', todayStr)
      .order('show_date', { ascending: true })
      .limit(13);

    if (error) {
      return NextResponse.json({ movies: [] });
    }

    return NextResponse.json({ movies: data || [] });
  } catch {
    return NextResponse.json({ movies: [] });
  }
}
