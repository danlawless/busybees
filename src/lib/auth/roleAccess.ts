/**
 * Who may call a staff or admin route. Pure, so it is unit tested without a
 * request or a database (same split as accountAccess.ts for check-in).
 */

export type RequiredRole = 'staff' | 'admin';
export type RoleAccess = 'allow' | 'unauthenticated' | 'forbidden';

/**
 * - No session: 'unauthenticated'.
 * - 'staff' routes: staff and admin.
 * - 'admin' routes: admin only.
 * - Anyone else -- customers, or a session with no `users` row -- 'forbidden'.
 */
export function decideRole(userId: string | null, role: string | null, required: RequiredRole): RoleAccess {
  if (!userId) return 'unauthenticated';
  if (role === 'admin') return 'allow';
  if (required === 'staff' && role === 'staff') return 'allow';
  return 'forbidden';
}
