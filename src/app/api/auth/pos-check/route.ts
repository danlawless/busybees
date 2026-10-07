/**
 * POS Check API Route
 * Check if a phone number has an existing account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireKioskDevice } from '@/lib/auth/posDevice';

export async function POST(request: NextRequest) {
  try {
    // Kiosk-only: the store's approved device (POS PIN entered) or staff.
    const deviceDenied = await requireKioskDevice(request);
    if (deviceDenied) return deviceDenied;

    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/[^\d]/g, '');

    if (cleanPhone.length !== 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone', cleanPhone)
      // Customers only: a staff or admin account (or the shared /admin one)
      // must never be signed into, or claimed, by phone number.
      .eq('role', 'customer')
      .single();

    if (!user) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: true });
  } catch (error) {
    console.error('POS check error:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
