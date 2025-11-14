/**
 * POS Login API Route
 * Authenticate users with phone + PIN for POS system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPin } from '@/lib/auth/pin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, pin } = body;

    // Validate inputs
    if (!phone || !pin) {
      return NextResponse.json(
        { error: 'Phone and PIN are required' },
        { status: 400 }
      );
    }

    // Normalize phone (remove formatting)
    const cleanPhone = phone.replace(/[^\d]/g, '');

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Find user by phone
    const supabase = await createClient();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', cleanPhone)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid phone number or PIN' },
        { status: 401 }
      );
    }

    // Check if user has a PIN set
    if (!user.pin_hash) {
      return NextResponse.json(
        { error: 'PIN not set for this account. Please sign up at the POS.' },
        { status: 401 }
      );
    }

    // Verify PIN
    const isValidPin = await verifyPin(pin, user.pin_hash);

    if (!isValidPin) {
      return NextResponse.json(
        { error: 'Invalid phone number or PIN' },
        { status: 401 }
      );
    }

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

