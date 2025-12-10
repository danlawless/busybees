/**
 * POS Login API Route
 * Authenticate users with phone number for POS system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    // Validate input
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Normalize phone (remove formatting)
    const cleanPhone = phone.replace(/[^\d]/g, '');

    if (cleanPhone.length !== 10 || !/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
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
        { error: 'No account found with that phone number' },
        { status: 404 }
      );
    }

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Use phone-based password for Supabase auth
    const authPassword = `PHONE-${cleanPhone}`;

    // Update user's password to phone-based format
    // Also confirm email since they're verified in person at POS
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: authPassword,
        email_confirm: true, // Staff verified them in person
      }
    );

    if (updateError) {
      console.error('Error updating user password:', updateError);
      return NextResponse.json(
        { error: 'Failed to update authentication' },
        { status: 500 }
      );
    }

    // Create Supabase session with phone-based auth
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
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Return user data (excluding sensitive fields)
    const { pin_hash, ...userWithoutPin } = user;

    // Update the response with user data
    return NextResponse.json({
      user: userWithoutPin,
      message: 'Login successful'
    }, {
      status: 200,
      headers: response.headers,
    });

  } catch (error) {
    console.error('POS login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

