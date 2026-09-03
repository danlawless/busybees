/**
 * Staff/admin gate for the session endpoints.
 *
 * `middleware.ts` excludes every `/api` path from auth, so an API route is
 * only as protected as its own first few lines. Check-in used to write nothing
 * that cost anything; since migration 052 the insert itself spends a punch and
 * a delete refunds one, which puts these routes in the same class as
 * `/api/purchases/pos`. This is that route's own check (see
 * `src/app/api/purchases/pos/route.ts`), lifted verbatim so all three session
 * endpoints answer the same way rather than each inventing a variation.
 *
 * Returns the response to send when the caller is not staff, or null to
 * continue.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function requireStaff(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || !['staff', 'admin'].includes(userData.role)) {
    return NextResponse.json({ error: 'Forbidden - Staff only' }, { status: 403 });
  }

  return null;
}
