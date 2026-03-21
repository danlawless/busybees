/**
 * Public API: Get currently active announcements
 * Returns announcements where current date/time falls within the scheduled window
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const supabase = createAdminClient();
    const now = new Date();

    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('announcements')
      .select('id, message, bg_color, text_color')
      .eq('is_active', true)
      .lte('start_date', todayStr)
      .gte('end_date', todayStr)
      .lte('start_time', currentTime)
      .gte('end_time', currentTime)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ announcements: [] });
    }

    return NextResponse.json({ announcements: data || [] });
  } catch {
    return NextResponse.json({ announcements: [] });
  }
}
