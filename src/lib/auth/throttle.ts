/**
 * Slow down and block repeated wrong PINs and passwords.
 *
 * A 4-8 digit PIN falls to a script without a limit. Every attempt is written
 * down *before* it is judged (as a failure, flipped to success afterwards), so
 * a burst of simultaneous guesses all see each other and cannot slip through
 * together. Then two counts decide:
 *
 * - failures for this key (an address, or an account) in the window, and
 * - for PIN checks, failures for the whole check -- many addresses guessing
 *   together. Password logins have no overall block (it would let anyone lock
 *   every customer out); they are limited per address and per account instead.
 *
 * Attempts live in `auth_attempts` (migration 055). If that table is missing
 * -- code deployed before the migration -- the limiter lets the attempt through
 * and reports it, rather than locking every staff member out.
 */

import type { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export type ThrottleScope = 'admin-pin' | 'pos-pin' | 'web-login' | 'web-login-account' | 'staff-login';

export interface ThrottleLimits {
  /** Failures allowed for one key (address or account) within the window. */
  perKey: number;
  /** Failures allowed for the whole check within the window; null for none. */
  overall: number | null;
  windowMinutes: number;
}

export const LIMITS: Record<ThrottleScope, ThrottleLimits> = {
  // PINs: few values, so tight per-address limits and an overall cap.
  'admin-pin': { perKey: 5, overall: 50, windowMinutes: 60 },
  'pos-pin': { perKey: 5, overall: 50, windowMinutes: 60 },
  // Passwords: far more values, and people mistype them.
  'web-login': { perKey: 10, overall: null, windowMinutes: 15 },
  'web-login-account': { perKey: 10, overall: null, windowMinutes: 15 },
  'staff-login': { perKey: 5, overall: null, windowMinutes: 15 },
};

/**
 * Pure: counts include the attempt being judged (it was recorded first), so
 * `perKey` failures are allowed and the next one is refused.
 */
export function decideThrottle(
  failuresForKey: number,
  failuresOverall: number,
  limits: ThrottleLimits
): { allowed: true } | { allowed: false; reason: 'key' | 'overall' } {
  if (failuresForKey > limits.perKey) return { allowed: false, reason: 'key' };
  if (limits.overall !== null && failuresOverall > limits.overall) return { allowed: false, reason: 'overall' };
  return { allowed: true };
}

/**
 * The caller's address as Vercel reports it (it overwrites x-forwarded-for).
 * IPv6 is grouped by its /64 network, since one household or attacker holds
 * a whole /64 and could otherwise step through addresses.
 */
export function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = (forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim();
  return normalizeAddress(ip);
}

/** Pure: IPv4 as-is, IPv6 cut to its /64 network. */
export function normalizeAddress(ip: string): string {
  if (!ip.includes(':')) return ip;
  const groups = ip.split('::')[0].split(':').filter(Boolean);
  return `${groups.slice(0, 4).join(':')}::/64`;
}

export const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a while and try again.';

export interface Attempt {
  allowed: boolean;
  /** The recorded row, to mark succeeded; null when the table is unavailable. */
  id: number | null;
}

/**
 * Record an attempt for `key` and decide whether it may proceed. Call
 * finishAttempt(attempt, true) when it turns out to be right.
 * `skipOverall` exempts a caller already trusted (e.g. an approved POS device).
 */
export async function beginAttempt(
  scope: ThrottleScope,
  key: string,
  { skipOverall = false }: { skipOverall?: boolean } = {}
): Promise<Attempt> {
  const limits = LIMITS[scope];
  const since = new Date(Date.now() - limits.windowMinutes * 60_000).toISOString();
  const db = createAdminClient();
  try {
    const { data: row, error: insertError } = await db
      .from('auth_attempts')
      .insert({ scope, ip: key, succeeded: false })
      .select('id')
      .single();
    if (insertError) throw insertError;

    const countFailures = (forKey: boolean) => {
      let q = db.from('auth_attempts').select('id', { count: 'exact', head: true })
        .eq('scope', scope).eq('succeeded', false).gte('attempted_at', since);
      if (forKey) q = q.eq('ip', key);
      return q;
    };
    const [forKey, overall] = await Promise.all([
      countFailures(true),
      limits.overall === null || skipOverall ? Promise.resolve({ count: 0, error: null }) : countFailures(false),
    ]);
    if (forKey.error) throw forKey.error;
    if (overall.error) throw overall.error;

    const decision = decideThrottle(forKey.count ?? 0, overall.count ?? 0, limits);
    if (!decision.allowed) {
      logger.warn({ scope, key, reason: decision.reason }, 'Login attempt throttled');
      if (decision.reason === 'overall') {
        Sentry.captureMessage(`Login check '${scope}' is under a guessing attack`, { level: 'warning' });
      }
    }
    return { allowed: decision.allowed, id: row.id };
  } catch (error) {
    logger.error({ error, scope }, 'Login throttle unavailable -- allowing attempt (is migration 055 applied?)');
    Sentry.captureException(error, { tags: { component: 'auth-throttle', scope } });
    return { allowed: true, id: null };
  }
}

/** Mark a recorded attempt as having succeeded. Never throws. */
export async function finishAttempt(attempt: Attempt, succeeded: boolean): Promise<void> {
  if (!succeeded || attempt.id === null) return;
  const { error } = await createAdminClient()
    .from('auth_attempts')
    .update({ succeeded: true })
    .eq('id', attempt.id);
  if (error) logger.error({ error }, 'Could not record successful login attempt');
}
