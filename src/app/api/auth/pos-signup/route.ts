/**
 * POS Signup API Route
 * Create new customer account with phone number for POS system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { requireKioskDevice } from '@/lib/auth/posDevice';
import { hiddenPasswordFor } from '@/lib/auth/hiddenPassword';
import { createPosCustomer, posCustomerSchema } from '@/lib/auth/createPosCustomer';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Kiosk-only: the store's approved device (POS PIN entered) or staff.
    const deviceDenied = await requireKioskDevice(request);
    if (deviceDenied) return deviceDenied;

    const body = await request.json();

    // Same validation createPosCustomer applies; read the email for sign-in.
    const parsedBody = posCustomerSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    const { email } = parsedBody.data;

    const created = await createPosCustomer(body);
    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: created.status });
    }
    const authPassword = hiddenPasswordFor(created.userId);
    const newUser = created.user;

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
      email,
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
