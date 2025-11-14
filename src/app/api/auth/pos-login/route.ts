/**
 * POS Login API Route
 * Authenticate users with phone + PIN for POS system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyPin } from '@/lib/auth/pin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneLast4, pin } = body;

    // Validate inputs
    if (!phoneLast4 || !pin) {
      return NextResponse.json(
        { error: 'Phone last 4 digits and PIN are required' },
        { status: 400 }
      );
    }

    if (phoneLast4.length !== 4 || !/^\d{4}$/.test(phoneLast4)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Find user by last 4 digits of phone (use admin client to bypass RLS)
    const supabase = createAdminClient();
    
    // Get all users and filter by last 4 digits in code (more reliable than LIKE)
    const { data: allUsers, error: userError } = await supabase
      .from('users')
      .select('*');

    if (userError) {
      console.error('Error fetching users:', userError);
      return NextResponse.json(
        { error: 'Login failed' },
        { status: 500 }
      );
    }

    // Filter users whose phone ends with the last 4 digits
    const users = allUsers?.filter(u => u.phone && u.phone.slice(-4) === phoneLast4) || [];

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No account found with those digits' },
        { status: 404 }
      );
    }

    // If multiple users have same last 4 digits, we'll try to authenticate with PIN
    // and return the first match
    let authenticatedUser = null;

    for (const user of users) {
      if (!user.pin_hash) continue;

      const isValidPin = await verifyPin(pin, user.pin_hash);
      if (isValidPin) {
        authenticatedUser = user;
        break;
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: 'Invalid phone number or PIN' },
        { status: 401 }
      );
    }

    const user = authenticatedUser;

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Return user data (excluding sensitive fields)
    const { pin_hash, ...userWithoutPin } = user;

    return NextResponse.json({
      user: userWithoutPin,
      message: 'Login successful'
    }, { status: 200 });

  } catch (error) {
    console.error('POS login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

