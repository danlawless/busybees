/**
 * Web Signup API Route
 * Create new customer account with phone number and password for website
 * Differs from POS signup which uses phone-only authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email/resend';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name, email, password } = body;

    // Validate required fields
    if (!phone || !name || !email || !password) {
      return NextResponse.json(
        { error: 'Phone, name, email, and password are required' },
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

    // Check if phone already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, phone, email, has_web_password')
      .eq('phone', cleanPhone)
      .single();

    if (existingUser) {
      // If user exists but doesn't have a web password, they may have signed up at POS
      // Allow them to set a web password
      if (!existingUser.has_web_password) {
        const webPasswordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const { error: updateError } = await supabase
          .from('users')
          .update({
            web_password_hash: webPasswordHash,
            has_web_password: true,
          })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('Error setting web password:', updateError);
          return NextResponse.json(
            { error: 'Failed to set password. Please try again.' },
            { status: 500 }
          );
        }

        // Create session for the user
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

        // Sign in with their existing Supabase auth
        const authPassword = `PHONE-${cleanPhone}`;
        const { data: signInData, error: signInError } = await supabaseResponse.auth.signInWithPassword({
          email: existingUser.email,
          password: authPassword,
        });

        if (signInError || !signInData.session) {
          // Session creation failed but password was set - they can log in manually
          return NextResponse.json({
            user: { ...existingUser, has_web_password: true },
            message: 'Password set successfully. Please log in.'
          }, { status: 200 });
        }

        return NextResponse.json({
          user: { ...existingUser, has_web_password: true },
          message: 'Password set successfully! You can now log in with your phone and password.'
        }, {
          status: 200,
          headers: response.headers,
        });
      }

      return NextResponse.json(
        { error: 'An account with this phone number already exists. Please log in instead.' },
        { status: 409 }
      );
    }

    // Hash the web password
    const webPasswordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Use phone-based password for Supabase auth (for session management)
    const authPassword = `PHONE-${cleanPhone}`;

    // Try to create Supabase Auth user first (generates proper UUID)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: authPassword,
      email_confirm: true, // Auto-confirm for web signups
      user_metadata: {
        name: name.trim(),
        phone: cleanPhone,
        role: 'customer',
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);

      // Check if it's a duplicate email error
      if (authError.message?.includes('already been registered') || authError.status === 422) {
        return NextResponse.json(
          { error: 'This email is already registered. Please use a different email or log in.' },
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
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        phone: cleanPhone,
        name: name.trim(),
        email: email.trim(),
        role: 'customer',
        web_password_hash: webPasswordHash,
        has_web_password: true,
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

    // Sign them in immediately
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
      console.error('Sign in error after signup:', signInError);
      // Still return success - user can login manually
      return NextResponse.json({
        user: { ...newUser, web_password_hash: undefined },
        message: 'Account created successfully! Please log in.'
      }, { status: 201 });
    }

    // Send welcome email (fire and forget)
    sendWelcomeEmail({
      to: email.trim(),
      name: name.trim(),
      phone: cleanPhone,
    }).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    // Return user data (excluding sensitive fields)
    const { web_password_hash, ...userWithoutHash } = newUser;

    return NextResponse.json({
      user: userWithoutHash,
      message: 'Account created successfully!'
    }, {
      status: 201,
      headers: response.headers,
    });

  } catch (error) {
    console.error('Web signup error:', error);
    return NextResponse.json(
      { error: 'Signup failed. Please try again.' },
      { status: 500 }
    );
  }
}
