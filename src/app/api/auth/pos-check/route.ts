/**
 * POS Check API Route
 * Check if a phone number has an account and whether password is set
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
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
      .select('id, has_web_password, role')
      .eq('phone', cleanPhone)
      .eq('role', 'customer')
      .single();

    if (!user) {
      return NextResponse.json({ exists: false, hasPassword: false });
    }

    return NextResponse.json({
      exists: true,
      hasPassword: user.has_web_password || false,
    });
  } catch (error) {
    console.error('POS check error:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
