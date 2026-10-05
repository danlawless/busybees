/**
 * /admin PIN login -- signs in to the shared admin account (staff@busybees.internal).
 *
 * The PIN is the only credential, so: it must be set in settings (`staff_pin`,
 * 4-8 digits; there is no built-in default -- a hard-coded 0297 used to be
 * accepted alongside whatever was set), wrong guesses are limited
 * (lib/auth/throttle), and the shared account signs in with its hidden auth
 * password (lib/auth/hiddenPassword), never one derived from the PIN.
 *
 * Personal logins for the POS go through /api/auth/staff-auth instead.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { hiddenPasswordFor, throwawayPassword } from '@/lib/auth/hiddenPassword';
import { beginAttempt, clientAddress, finishAttempt, TOO_MANY_ATTEMPTS } from '@/lib/auth/throttle';

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

    // Validate PIN format (4-8 digits)
    if (!/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 });
    }

    // Use admin client to read settings (bypasses RLS)
    const adminClient = createAdminClient();

    // The PIN must be set; there is no default to fall back on.
    const { data: pinSetting, error: settingsError } = await adminClient
      .from('settings')
      .select('value')
      .eq('key', 'staff_pin')
      .maybeSingle();
    if (settingsError || !pinSetting?.value) {
      logger.error({ error: settingsError }, 'Admin PIN login refused: no staff_pin is set');
      return NextResponse.json({ error: 'Admin PIN is not set up.' }, { status: 503 });
    }

    const ip = clientAddress(request);
    const attempt = await beginAttempt('admin-pin', ip);
    if (!attempt.allowed) {
      return NextResponse.json({ error: TOO_MANY_ATTEMPTS }, { status: 429 });
    }
    const valid = pin === String(pinSetting.value);
    await finishAttempt(attempt, valid);
    if (!valid) {
      logger.warn({ ip }, 'Invalid admin PIN attempt');
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // PIN is valid. The shared account's auth password is its hidden one,
    // derived from its id once known -- never from the PIN.

    // Ensure staff auth user exists with correct password.
    // Use create-first approach: try to create, and if user already exists,
    // find and update their password instead.
    let staffUserId: string;

    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: STAFF_EMAIL,
      password: throwawayPassword(),
      email_confirm: true,
      user_metadata: {
        name: STAFF_NAME,
        role: 'admin',
      },
    });

    if (createData?.user) {
      // New user created successfully
      staffUserId = createData.user.id;
      logger.info({ staffUserId }, 'Created new staff auth user');

      // Create staff user in users table
      const { error: createUserError } = await adminClient
        .from('users')
        .upsert({
          id: staffUserId,
          phone: STAFF_PHONE,
          name: STAFF_NAME,
          email: STAFF_EMAIL,
          role: 'admin',
        }, { onConflict: 'id' });

      if (createUserError) {
        logger.error({ error: createUserError }, 'Failed to create staff user record');
        await adminClient.auth.admin.deleteUser(staffUserId);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
      }
    } else {
      // User already exists - find them and update password
      logger.info({ createError: createError?.message }, 'Staff user exists, updating password');

      // Paginate through all auth users to find the staff account.
      // listUsers only returns one page at a time, so a single call misses
      // the staff user once the total user count exceeds the page size.
      const PER_PAGE = 1000;
      let staffAuthUser: Awaited<
        ReturnType<typeof adminClient.auth.admin.listUsers>
      >['data']['users'][number] | undefined;

      for (let page = 1; page <= 100; page++) {
        const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
          page,
          perPage: PER_PAGE,
        });

        if (listError) {
          logger.error({ error: listError }, 'Failed to list users');
          return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
        }

        const users = listData?.users ?? [];
        staffAuthUser = users.find(u => u.email === STAFF_EMAIL);

        if (staffAuthUser || users.length < PER_PAGE) break;
      }

      if (!staffAuthUser) {
        // Very unusual: create failed but user not found in list
        logger.error(
          { createError: createError?.message },
          'Staff user create failed and not found in user list'
        );
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
      }

      staffUserId = staffAuthUser.id;

      // Ensure user exists in users table with admin role
      await adminClient
        .from('users')
        .upsert({
          id: staffUserId,
          phone: STAFF_PHONE,
          name: STAFF_NAME,
          email: STAFF_EMAIL,
          role: 'admin',
        }, { onConflict: 'id' });
    }

    // Give the shared account its hidden auth password, then sign in with it.
    const staffPassword = hiddenPasswordFor(staffUserId);
    const { error: passwordError } = await adminClient.auth.admin.updateUserById(staffUserId, {
      password: staffPassword,
    });
    if (passwordError) {
      logger.error({ error: passwordError }, 'Failed to set staff account password');
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    // Create session by signing in as staff user
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
      logger.error({ error: signInError, staffUserId }, 'Failed to sign in staff user');
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    logger.info({ staffUserId }, 'Staff user authenticated successfully');

    return response;
  } catch (error) {
    logger.error({ error }, 'Staff login error');
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
