/**
 * POS Mode Settings API
 * GET - Get current POS mode
 * POST - Set POS mode (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPOSMode, setPOSMode, type POSMode } from '@/lib/services/pos-settings';

export async function GET() {
  try {
    const mode = await getPOSMode();
    return NextResponse.json({ mode });
  } catch (error) {
    console.error('Error fetching POS mode:', error);
    return NextResponse.json(
      { error: 'Failed to fetch POS mode' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { mode } = body;

    if (mode !== 'kiosk' && mode !== 'staff') {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "kiosk" or "staff"' },
        { status: 400 }
      );
    }

    await setPOSMode(mode as POSMode);

    return NextResponse.json({ success: true, mode });
  } catch (error) {
    console.error('Error setting POS mode:', error);
    return NextResponse.json(
      { error: 'Failed to set POS mode' },
      { status: 500 }
    );
  }
}

