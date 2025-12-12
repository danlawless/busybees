/**
 * Set Password API Route
 * Allow POS users to set a password for web access
 * Verifies identity by matching phone, email, and name
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, name, password } = body;

    // Validate required fields
    if (!phone || !email || !name || !password) {
      return NextResponse.json(
        { error: 'Phone, email, name, and password are required' },
        { status: 400 }
      );
    }

    // Normalize phone (remove formatting)
    const cleanPhone = phone.replace(/[^\d]/g, '');

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit phone number' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find user by phone number
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', cleanPhone)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'No account found with that phone number. Please check your information or sign up.' },
        { status: 404 }
      );
    }

    // Verify email matches (case-insensitive)
    if (user.email.toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'The email address does not match our records. Please check your information.' },
        { status: 400 }
      );
    }

    // Verify name matches (case-insensitive, trim whitespace)
    const normalizedInputName = name.trim().toLowerCase().replace(/\s+/g, ' ');
    const normalizedStoredName = user.name.trim().toLowerCase().replace(/\s+/g, ' ');

    if (!normalizedStoredName.includes(normalizedInputName) && !normalizedInputName.includes(normalizedStoredName)) {
      return NextResponse.json(
        { error: 'The name does not match our records. Please enter the name you used when signing up.' },
        { status: 400 }
      );
    }

    // Check if user already has a web password
    if (user.has_web_password) {
      return NextResponse.json(
        { error: 'You already have a password set. Please use the login page or reset your password.' },
        { status: 409 }
      );
    }

    // Hash the password
    const webPasswordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Update user with web password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        web_password_hash: webPasswordHash,
        has_web_password: true,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error setting web password:', updateError);
      return NextResponse.json(
        { error: 'Failed to set password. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Password set successfully! You can now log in with your phone number and password.',
      success: true
    }, { status: 200 });

  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json(
      { error: 'Failed to set password. Please try again.' },
      { status: 500 }
    );
  }
}
