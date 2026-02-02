/**
 * POS Signup API Route
 * Create new customer account with phone number for POS system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name, email } = body;

    // Validate required fields
    if (!phone || !name || !email) {
      return NextResponse.json(
        { error: 'Phone, name, and email are required' },
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

    // Normalize phone (remove formatting)
    const cleanPhone = phone.replace(/[^\d]/g, '');

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if phone already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, phone, email')
      .eq('phone', cleanPhone)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 409 }
      );
    }

    // Use phone-based password for Supabase auth
    const authPassword = `PHONE-${cleanPhone}`;

    // Try to create Supabase Auth user first (generates proper UUID)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: authPassword,
      email_confirm: true, // Staff verified in person at POS
      user_metadata: {
        name: name.trim(),
        phone: cleanPhone,
        role: 'customer',
      },
    });

    if (authError) {
      logger.error({ error: authError }, 'Error creating auth user');

      // Check if it's a duplicate email error
      if (authError.message?.includes('already been registered') || authError.status === 422) {
        return NextResponse.json(
          { error: 'This email is already registered. You may already have an account - try logging in with your phone number.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create user profile record with the auth user's ID
    // No web password — customer sets one later if they want web portal access
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id, // Use the auth user's UUID
        phone: cleanPhone,
        name: name.trim(),
        email: email.trim(),
        role: 'customer',
        has_web_password: false,
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error({ error: insertError }, 'Error creating user profile');
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Send welcome email (non-blocking - don't fail signup if email fails)
    const formattedPhone = `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
    sendWelcomeEmail({
      to: email.trim(),
      name: name.trim(),
      phone: formattedPhone,
    }).then((result) => {
      if (result.success) {
        logger.info({ email: email.trim(), messageId: result.messageId }, '📧 Welcome email sent to new POS customer');
      } else {
        logger.error({ email: email.trim(), error: result.error }, '❌ Failed to send welcome email');
      }
    }).catch((err) => {
      logger.error({ error: err, email: email.trim() }, '❌ Exception sending welcome email');
    });

    // Sign them in immediately using their phone-based password
    const response = NextResponse.json({}, { status: 201 });

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
      email: email.trim(),
      password: authPassword,
    });

    if (signInError || !signInData.session) {
      logger.warn({ error: signInError }, 'Sign in error after signup - user can login manually');
      // Still return success - user can login manually
      return NextResponse.json({
        user: newUser,
        message: 'Account created successfully'
      }, { status: 201 });
    }

    // Return user data
    return NextResponse.json({
      user: newUser,
      message: 'Account created successfully'
    }, {
      status: 201,
      headers: response.headers,
    });

  } catch (error) {
    logger.error({ error }, 'POS signup error');
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    );
  }
}
