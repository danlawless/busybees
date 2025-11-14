/**
 * POS Signup API Route
 * Create new customer account with phone + PIN for POS system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { hashPin, validatePinFormat } from '@/lib/auth/pin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, pin, name, email } = body;

    // Validate required fields
    if (!phone || !pin || !name || !email) {
      return NextResponse.json(
        { error: 'Phone, PIN, name, and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
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

    const supabase = createAdminClient();

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

    // Create Supabase Auth user first (generates proper UUID)
    // Use a random secure password since POS users login with PIN
    const tempPassword = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}Aa1!`;
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: false, // Don't require email verification for POS signups
      user_metadata: {
        name: name.trim(),
        phone: cleanPhone,
        role: 'customer',
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create user profile record with the auth user's ID
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id, // Use the auth user's UUID
        phone: cleanPhone,
        name: name.trim(),
        email: email.trim(),
        pin_hash: pinHash,
        role: 'customer',
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user profile:', insertError);
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
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

