/**
 * Entitlement gate for the check-in endpoints.
 *
 * `middleware.ts` excludes every `/api` path from auth, so an API route is only
 * as protected as its own first few lines. Since migration 052 a check-in
 * insert spends a punch, so these routes cannot stay open -- but they cannot be
 * staff-only either: `/api/auth/pos-login` signs the *customer* in, and a
 * self-service device checks in as that customer. The requirement is that the
 * caller be entitled to the account they name, which is what this enforces.
 *
 * Same shape as `requireStaff` -- lifted from
 * `src/app/api/purchases/pos/route.ts` -- so all the session endpoints answer
 * the same way: it returns the response to send when the caller is not allowed,
 * or null to continue. `requireStaff` stays as it is for `DELETE`, which
 * reverses an already-spent punch and is not self-service.
 *
 * The decision itself lives in `accountAccess.ts` and is unit tested there.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decideAccountAccess, type AccountCaller } from './accountAccess';

export async function requireAccountAccess(customerId: string): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Read the role only once there is a session to read it for; a missing
  // `users` row leaves the role null, which grants nothing on its own.
  let caller: AccountCaller = { userId: null, role: null };
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    caller = { userId: user.id, role: userData?.role ?? null };
  }

  switch (decideAccountAccess(caller, customerId)) {
    case 'allow':
      return null;
    case 'unauthenticated':
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    case 'forbidden':
      // Says that the account is not the caller's, and nothing about which id
      // in the request it disagreed with.
      return NextResponse.json(
        { error: 'Forbidden - you are not signed in to this account' },
        { status: 403 }
      );
  }
}
