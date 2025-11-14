/**
 * POS Signup API Route
 * Create new customer account with phone + PIN for POS system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashPin, validatePinFormat } from '@/lib/auth/pin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, pin, name, email } = body;

    // Validate required fields
    if (!phone || !pin || !name) {
      return NextResponse.json(
        { error: 'Phone, PIN, and name are required' },
        { status: 400 }
      );
    }

    // Validate PIN format
    const pinValidation = validatePinFormat(pin);
    if (!pinValidation.valid) {
      return NextResponse.json(
        { error: pinValidation.error },
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

    const supabase = await createClient();

    // Check if phone already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, phone')
      .eq('phone', cleanPhone)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 409 }
      );
    }

    // Hash the PIN
    const pinHash = await hashPin(pin);

    // Create user record (without Supabase auth for POS-only users)
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        phone: cleanPhone,
        name: name.trim(),
        email: email?.trim() || null,
        pin_hash: pinHash,
        role: 'customer',
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Return user data (excluding sensitive fields)
    const { pin_hash, ...userWithoutPin } = newUser;

    return NextResponse.json({
      user: userWithoutPin,
      message: 'Account created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POS signup error:', error);
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    );
  }
}

