/**
 * Who may act on a given account's passes.
 *
 * Split out of the route guard so the decision can be unit tested without a
 * database or a request, in the same way `batch/validation.ts` is split out of
 * `batch/route.ts`.
 *
 * Check-in is not a staff-only errand. `/api/auth/pos-login` signs the
 * *customer* in after a phone lookup, and a self-service device then runs the
 * check-in screen as that customer -- so the gate on check-in cannot be "you
 * work here". What it can be is "these are yours": staff and admin act on any
 * account, and a customer acts on their own and nobody else's.
 *
 * `customer_id` is a `users.id`, which is also the Supabase auth id, so owning
 * the account is exactly `caller.userId === customerId`.
 *
 * This says only who may call. Whether the ids in the body hang together --
 * that each pass and child really belongs to `customer_id` -- is still checked
 * separately, and still matters: staff can name any account at all.
 */

import type { Database } from '@/lib/supabase/database.types';

export type CallerRole = Database['public']['Tables']['users']['Row']['role'];

export interface AccountCaller {
  /** Supabase auth id of the signed-in caller, or null when there is no session. */
  userId: string | null;
  /** Role from the caller's `users` row, or null when that row is missing. */
  role: CallerRole | null;
}

export type AccountAccess = 'allow' | 'unauthenticated' | 'forbidden';

const STAFF_ROLES: readonly CallerRole[] = ['staff', 'admin'];

/**
 * Decide whether `caller` may act on `customerId`'s passes.
 *
 * Pure: a function of the role, the authenticated id and the requested
 * account, nothing else.
 *
 * - No session at all is 'unauthenticated'. Anonymous callers must never reach
 *   these routes: `middleware.ts` excludes every `/api` path, so this is the
 *   only thing standing between the open internet and a punch being spent.
 * - Staff and admin are allowed on any account, as they were before.
 * - Anyone else is allowed only on their own account. A customer holding a
 *   real session still cannot name someone else's `customer_id`, however
 *   consistent the rest of the body is.
 */
export function decideAccountAccess(caller: AccountCaller, customerId: string): AccountAccess {
  if (!caller.userId) {
    return 'unauthenticated';
  }

  if (caller.role !== null && STAFF_ROLES.includes(caller.role)) {
    return 'allow';
  }

  return caller.userId === customerId ? 'allow' : 'forbidden';
}
