/**
 * API Route: Check if a PIN matches the admin PIN
 * Returns { isAdmin: true/false } without creating a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ isAdmin: false });
    }

    const supabase = createAdminClient();

    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'admin_pin')
      .single();

    if (settings?.value && settings.value === pin) {
      return NextResponse.json({ isAdmin: true });
    }

    return NextResponse.json({ isAdmin: false });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
