/**
 * Role gates for API routes.
 *
 * `middleware.ts` excludes every `/api` path, so an API route is only as
 * protected as its own first lines. The POS PIN is a lock on the device's
 * screen, not on the server: it never reaches these routes. What does reach
 * them is the Supabase session that /api/auth/staff-auth (POS) and
 * /api/auth/staff-login (/admin) create, and the role on the caller's `users`
 * row -- so that is what these check.
 *
 * Same shape as requireAccountAccess: returns the response to send when the
 * caller may not proceed, or null to continue.
 *
 *   const denied = await requireStaff();
 *   if (denied) return denied;
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decideRole, type RequiredRole } from './roleAccess';

async function requireRole(required: RequiredRole): Promise<NextResponse<{ error: string }> | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
    role = data?.role ?? null;
  }

  switch (decideRole(user ? user.id : null, role, required)) {
    case 'allow':
      return null;
    case 'unauthenticated':
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    case 'forbidden':
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

/** Front-desk staff or an admin. */
export function requireStaff(): Promise<NextResponse<{ error: string }> | null> {
  return requireRole('staff');
}

/** Admins only -- what the POS shows only to admins, and the /admin pages. */
export function requireAdmin(): Promise<NextResponse<{ error: string }> | null> {
  return requireRole('admin');
}
