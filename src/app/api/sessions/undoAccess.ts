/**
 * Who may undo a check-in.
 *
 * Split out of the route guard so the decision can be unit tested without a
 * database or a request, like `accountAccess.ts`.
 *
 * Undoing a check-in gives a punch back, so a family must not be able to do it
 * for itself -- check in, play, undo, and the visit was free. That is why it
 * was staff-only. But the front desk works signed in as the customer: the
 * phone lookup (`/api/auth/pos-login`) signs the POS in as them, and the undo
 * button only exists on that screen. So "you work here" is proven a second
 * way: the POS PIN, which staff know and families do not.
 *
 * - No session at all is 'unauthenticated'.
 * - Staff and admin may undo any check-in, no PIN asked.
 * - A customer session may undo only its own check-in, and only with the PIN.
 *   The PIN never reaches anyone else's account.
 * - With no PIN configured the POS lock screen is open, so the PIN proves
 *   nothing: undo stays staff-only.
 */

import { timingSafeEqual } from 'node:crypto';
import type { AccountCaller } from './accountAccess';

export interface UndoRequest {
  caller: AccountCaller;
  /** customer_id on the session being undone, or null when it does not exist. */
  sessionOwnerId: string | null;
  /** The POS PIN from settings, or null/empty when none is set. */
  configuredPin: string | null;
  /** The PIN sent with the request, if any. */
  suppliedPin: string | null;
}

export type UndoAccess = 'allow' | 'unauthenticated' | 'forbidden' | 'pin_required' | 'wrong_pin';

export function decideUndoAccess({
  caller,
  sessionOwnerId,
  configuredPin,
  suppliedPin,
}: UndoRequest): UndoAccess {
  if (!caller.userId) return 'unauthenticated';
  if (caller.role === 'staff' || caller.role === 'admin') return 'allow';

  if (!configuredPin) return 'forbidden';
  if (!sessionOwnerId || sessionOwnerId !== caller.userId) return 'forbidden';

  if (!suppliedPin) return 'pin_required';
  return pinMatches(suppliedPin, configuredPin) ? 'allow' : 'wrong_pin';
}

/** Constant-time comparison, so response timing gives nothing away. */
export function pinMatches(supplied: string, configured: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}
