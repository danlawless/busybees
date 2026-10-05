/**
 * Staff Authentication API Route
 * Authenticate staff/admin users with phone + password
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { hiddenPasswordFor } from '@/lib/auth/hiddenPassword';
import { beginAttempt, clientAddress, finishAttempt, TOO_MANY_ATTEMPTS } from '@/lib/auth/throttle';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone and password are required' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/[^\d]/g, '');

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Find staff/admin user by phone
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('*')
      .eq('phone', cleanPhone)
      .in('role', ['staff', 'admin'])
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    if (!user.staff_password_hash) {
      return NextResponse.json(
        { error: 'Staff account not set up. Contact an admin.' },
        { status: 401 }
      );
    }

    const attempt = await beginAttempt('staff-login', clientAddress(request));
    if (!attempt.allowed) {
      return NextResponse.json({ error: TOO_MANY_ATTEMPTS }, { status: 429 });
    }
    const passwordValid = await bcrypt.compare(password, user.staff_password_hash);
    await finishAttempt(attempt, passwordValid);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await adminClient
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Create Supabase session
    const staffPassword = hiddenPasswordFor(user.id);

    // Update auth password
    const { error: passwordError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: staffPassword,
      email_confirm: true,
    });
    if (passwordError) {
      logger.error({ error: passwordError, userId: user.id }, 'Failed to set staff auth password');
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    const response = NextResponse.json({}, { status: 200 });

    const supabaseSession = createServerClient(
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

    const { error: signInError } = await supabaseSession.auth.signInWithPassword({
      email: user.email!,
      password: staffPassword,
    });

    if (signInError) {
      logger.error({ error: signInError }, 'Failed to sign in staff user');
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }

    logger.info({ userId: user.id, role: user.role }, 'Staff user authenticated');

    const { staff_password_hash, pin_hash, web_password_hash, ...safeUser } = user;

    return NextResponse.json({
      user: safeUser,
      message: 'Login successful',
    }, {
      status: 200,
      headers: response.headers,
    });
  } catch (error) {
    logger.error({ error }, 'Staff auth error');
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
