/**
 * @deprecated Use /api/auth/staff-auth instead (phone+password auth).
 * This PIN-based route is kept for backward compatibility during transition.
 * Staff Login API Route - Authenticates staff using PIN and creates a Supabase session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const STAFF_EMAIL = 'staff@busybees.internal';
const STAFF_NAME = 'Staff User';
const STAFF_PHONE = '0000000000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 });
    }

    // Use admin client to read settings (bypasses RLS)
    const adminClient = createAdminClient();

    // Get the staff PIN from settings
    const { data: pinSetting, error: settingsError } = await adminClient
      .from('settings')
      .select('value')
      .eq('key', 'staff_pin')
      .single();

    if (settingsError || !pinSetting) {
      logger.error({ error: settingsError }, 'Failed to fetch staff PIN setting');
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    // Verify PIN
    if (pin !== pinSetting.value) {
      logger.warn('Invalid staff PIN attempt');
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // PIN is valid - now authenticate or create staff user
    // Check if staff user exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const staffAuthUser = existingUsers?.users?.find(u => u.email === STAFF_EMAIL);

    // Generate a deterministic password from the PIN (for Supabase auth)
    const staffPassword = `STAFF-PIN-${pin}-AUTH`;

    let staffUserId: string;

    if (!staffAuthUser) {
      // Create staff auth user
      const { data: newAuthUser, error: createAuthError } = await adminClient.auth.admin.createUser({
        email: STAFF_EMAIL,
        password: staffPassword,
        email_confirm: true,
        user_metadata: {
          name: STAFF_NAME,
          role: 'admin',
        },
      });

      if (createAuthError || !newAuthUser.user) {
        logger.error({ error: createAuthError }, 'Failed to create staff auth user');
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
      }

      staffUserId = newAuthUser.user.id;

      // Create staff user in users table
      const { error: createUserError } = await adminClient
        .from('users')
        .insert({
          id: staffUserId,
          phone: STAFF_PHONE,
          name: STAFF_NAME,
          email: STAFF_EMAIL,
          role: 'admin',
        });

      if (createUserError) {
        logger.error({ error: createUserError }, 'Failed to create staff user record');
        // Clean up auth user if profile creation fails
        await adminClient.auth.admin.deleteUser(staffUserId);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
      }

      logger.info({ staffUserId }, 'Created new staff user');
    } else {
      staffUserId = staffAuthUser.id;

      // Update password in case PIN changed
      await adminClient.auth.admin.updateUserById(staffUserId, {
        password: staffPassword,
      });

      // Ensure user exists in users table with admin role
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id, role')
        .eq('id', staffUserId)
        .single();

      if (!existingUser) {
        // Create user record if missing
        await adminClient
          .from('users')
          .insert({
            id: staffUserId,
            phone: STAFF_PHONE,
            name: STAFF_NAME,
            email: STAFF_EMAIL,
            role: 'admin',
          });
      } else if (existingUser.role !== 'admin') {
        // Update role if not admin
        await adminClient
          .from('users')
          .update({ role: 'admin' })
          .eq('id', staffUserId);
      }
    }

    // Now sign in the staff user using session client
    const response = NextResponse.json({ success: true, message: 'Staff authenticated' });

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
      email: STAFF_EMAIL,
      password: staffPassword,
    });

    if (signInError) {
      logger.error({ error: signInError }, 'Failed to sign in staff user');
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    logger.info({ staffUserId }, 'Staff user authenticated successfully');

    return response;
  } catch (error) {
    logger.error({ error }, 'Staff login error');
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
