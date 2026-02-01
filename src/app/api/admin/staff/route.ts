/**
 * Admin Staff Management API
 * GET: List staff users
 * POST: Create staff user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';

async function verifyAdmin(request: NextRequest) {
  const adminClient = createAdminClient();

  // Get current user from cookie-based session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await adminClient
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!userData || userData.role !== 'admin') return null;
  return userData;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const adminClient = createAdminClient();

    const { data: staffUsers, error } = await adminClient
      .from('users')
      .select('id, phone, name, email, role, has_staff_password, last_login, created_at')
      .in('role', ['staff', 'admin'])
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch staff users');
      return NextResponse.json({ error: 'Failed to fetch staff users' }, { status: 500 });
    }

    return NextResponse.json({ staff: staffUsers || [] });
  } catch (error) {
    logger.error({ error }, 'Staff list error');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { phone, name, email, password, role } = body;

    if (!phone || !name || !email || !password) {
      return NextResponse.json(
        { error: 'Phone, name, email, and password are required' },
        { status: 400 }
      );
    }

    if (role && !['staff', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length !== 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check for existing user with this phone
    const { data: existing } = await adminClient
      .from('users')
      .select('id')
      .eq('phone', cleanPhone)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Phone number already in use' }, { status: 409 });
    }

    // Hash password
    const staffPasswordHash = await bcrypt.hash(password, 12);
    const authPassword = `STAFF-${cleanPhone}-AUTH`;

    // Create Supabase auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: authPassword,
      email_confirm: true,
      user_metadata: { name: name.trim(), role: role || 'staff' },
    });

    if (authError || !authData.user) {
      logger.error({ error: authError }, 'Failed to create staff auth user');
      if (authError?.message?.includes('already been registered')) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create staff user' }, { status: 500 });
    }

    // Create user profile
    const { data: newUser, error: insertError } = await adminClient
      .from('users')
      .insert({
        id: authData.user.id,
        phone: cleanPhone,
        name: name.trim(),
        email: email.trim(),
        role: role || 'staff',
        staff_password_hash: staffPasswordHash,
        has_staff_password: true,
      })
      .select('id, phone, name, email, role, has_staff_password, created_at')
      .single();

    if (insertError) {
      logger.error({ error: insertError }, 'Failed to create staff profile');
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Failed to create staff user' }, { status: 500 });
    }

    logger.info({ userId: newUser.id, role: newUser.role }, 'Staff user created');

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Staff creation error');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
