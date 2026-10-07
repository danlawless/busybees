/**
 * Member guest passes: the rules, with no database and no request.
 *
 * A monthly member may bring a family that is new to Busy Bees in free,
 * GUEST_PASS_ALLOWANCE times per membership period. "New" means no account
 * matches them, or the matching account has never bought anything. The route
 * gathers the facts; these functions decide. Spec:
 * docs/superpowers/specs/2026-10-07-member-guest-passes-design.md
 */

import type { AccountCaller } from '@/app/api/sessions/accountAccess';

export const GUEST_PASS_ALLOWANCE = 2;

/** Midnight Eastern, 1 Nov 2026. DST ends at 2 a.m. that day, so still UTC-4. */
export const GUEST_PASSES_START = new Date('2026-11-01T00:00:00-04:00');

export function guestPassesOpen(now: Date = new Date()): boolean {
  return now.getTime() >= GUEST_PASSES_START.getTime();
}

export function normalizeChildName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** One account that matched the friend's phone, email or child. */
export interface GuestMatch {
  userId: string;
  role: string | null;
  purchaseCount: number;
}

export type GuestEligibility =
  | { kind: 'new' }
  | { kind: 'existing'; userId: string }
  | { kind: 'not_eligible' }
  | { kind: 'conflict' };

/**
 * Any match that has bought something -- or is not a customer at all -- makes
 * the friend ineligible, however it matched. Matches that point at two
 * different empty accounts are refused rather than guessed between.
 */
export function decideGuestEligibility(matches: readonly GuestMatch[]): GuestEligibility {
  if (matches.length === 0) return { kind: 'new' };
  if (matches.some((m) => m.purchaseCount > 0 || m.role !== 'customer')) {
    return { kind: 'not_eligible' };
  }
  const ids = new Set(matches.map((m) => m.userId));
  if (ids.size > 1) return { kind: 'conflict' };
  return { kind: 'existing', userId: matches[0].userId };
}

export type GuestPassCaller =
  | { kind: 'allow'; memberId: string }
  | { kind: 'unauthenticated' }
  | { kind: 'forbidden' }
  | { kind: 'device_locked' }
  | { kind: 'member_required' };

/**
 * Who may spend (or undo) a member's guest pass. The front desk works signed
 * in as the member after a phone lookup, so the member's own session is
 * allowed -- but only on the store's approved POS device, or a member could
 * hand out passes from their phone at home. Staff may act for any member and
 * must say which.
 */
export function decideGuestPassCaller(input: {
  caller: AccountCaller;
  deviceApproved: boolean;
  requestedMemberId: string | null;
}): GuestPassCaller {
  const { caller, deviceApproved, requestedMemberId } = input;
  if (!caller.userId) return { kind: 'unauthenticated' };

  if (caller.role === 'staff' || caller.role === 'admin') {
    return requestedMemberId ? { kind: 'allow', memberId: requestedMemberId } : { kind: 'member_required' };
  }

  if (!deviceApproved) return { kind: 'device_locked' };
  if (requestedMemberId && requestedMemberId !== caller.userId) return { kind: 'forbidden' };
  return { kind: 'allow', memberId: caller.userId };
}

export const NOT_ELIGIBLE_MESSAGE = 'Already a Busy Bees customer — not eligible.';
export const CONFLICT_MESSAGE =
  'These details match more than one Busy Bees account. Ask a manager to merge them first.';

/** Counter wording for a refusal reason from issue_guest_pass. */
export function issueRefusalMessage(reason: string): string {
  switch (reason) {
    case 'not_new':
    case 'guest_not_customer':
    case 'same_account':
      return NOT_ELIGIBLE_MESSAGE;
    case 'none_left':
      return `This membership has used both of its ${GUEST_PASS_ALLOWANCE} guest passes. They reset when it renews.`;
    case 'no_membership':
      return 'Guest passes need an active monthly membership.';
    case 'child_not_found':
      return 'That child is not on the friend\'s account.';
    case 'not_configured':
      return 'Guest passes are not set up yet (missing Guest Pass product).';
    default:
      return 'Could not issue the guest pass. Please try again.';
  }
}
