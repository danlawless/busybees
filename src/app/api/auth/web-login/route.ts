/**
 * Web Login API Route
 * Authenticate users with phone number and password for website
 * Differs from POS login which uses phone-only authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    // Validate input
    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      );
    }

    // Normalize phone (remove formatting)
    const cleanPhone = phone.replace(/[^\d]/g, '');

    if (cleanPhone.length !== 10 || !/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit phone number' },
        { status: 400 }
      );
    }

    // Find user by phone number (use admin client to bypass RLS)
    const supabase = createAdminClient();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', cleanPhone)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'No account found with that phone number. Please sign up first.' },
        { status: 404 }
      );
    }

    // Check if user has a web password set
    if (!user.has_web_password || !user.web_password_hash) {
      return NextResponse.json(
        {
          error: 'This account was created at our facility. Please set a password to access your account online.',
          needsPasswordSetup: true,
          phone: cleanPhone
        },
        { status: 403 }
      );
    }

    // Verify password against stored hash
    const isValidPassword = await bcrypt.compare(password, user.web_password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Incorrect password. Please try again.' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Create Supabase session for the user
    // First, ensure their Supabase auth password is current
    const authPassword = `PHONE-${cleanPhone}`;

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: authPassword,
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error('Error updating user auth:', updateError);
      return NextResponse.json(
        { error: 'Login failed. Please try again.' },
        { status: 500 }
      );
    }

    // Create session with cookies
    const response = NextResponse.json({}, { status: 200 });

    const supabaseResponse = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Sign in with email and phone-based password
    const { data: signInData, error: signInError } = await supabaseResponse.auth.signInWithPassword({
      email: user.email,
      password: authPassword,
    });

    if (signInError || !signInData.session) {
      console.error('Sign in error:', signInError);
      return NextResponse.json(
        { error: 'Failed to create session. Please try again.' },
        { status: 500 }
      );
    }

    // Return user data (excluding sensitive fields)
    const { web_password_hash, pin_hash, ...userWithoutSensitive } = user;

    return NextResponse.json({
      user: userWithoutSensitive,
      message: 'Login successful!'
    }, {
      status: 200,
      headers: response.headers,
    });

  } catch (error) {
    console.error('Web login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
