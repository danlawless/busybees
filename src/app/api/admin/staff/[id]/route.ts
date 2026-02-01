/**
 * Admin Staff Management - Individual Staff User
 * PATCH: Update staff user
 * DELETE: Remove staff user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';

async function verifyAdmin(request: NextRequest) {
  const adminClient = createAdminClient();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, password, role } = body;

    const adminClient = createAdminClient();

    // Build update object
    const updates: Record<string, unknown> = {};
    if (name) updates.name = name.trim();
    if (email) updates.email = email.trim();
    if (phone) {
      const cleanPhone = phone.replace(/[^\d]/g, '');
      if (cleanPhone.length !== 10) {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
      }
      updates.phone = cleanPhone;
    }
    if (role && ['staff', 'admin'].includes(role)) {
      updates.role = role;
    }
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      updates.staff_password_hash = await bcrypt.hash(password, 12);
      updates.has_staff_password = true;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updatedUser, error } = await adminClient
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, phone, name, email, role, has_staff_password, last_login, created_at')
      .single();

    if (error) {
      logger.error({ error }, 'Failed to update staff user');
      return NextResponse.json({ error: 'Failed to update staff user' }, { status: 500 });
    }

    // Update auth email if changed
    if (email) {
      await adminClient.auth.admin.updateUserById(id, { email: email.trim() });
    }

    logger.info({ userId: id }, 'Staff user updated');

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    logger.error({ error }, 'Staff update error');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (admin.id === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Delete from users table
    const { error: deleteError } = await adminClient
      .from('users')
      .delete()
      .eq('id', id)
      .in('role', ['staff', 'admin']);

    if (deleteError) {
      logger.error({ error: deleteError }, 'Failed to delete staff user');
      return NextResponse.json({ error: 'Failed to delete staff user' }, { status: 500 });
    }

    // Delete from auth
    await adminClient.auth.admin.deleteUser(id);

    logger.info({ userId: id }, 'Staff user deleted');

    return NextResponse.json({ message: 'Staff user deleted' });
  } catch (error) {
    logger.error({ error }, 'Staff deletion error');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
