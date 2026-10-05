/**
 * Slow down and block repeated wrong PINs and passwords.
 *
 * A 4-6 digit PIN falls to a script in minutes without a limit. Each check
 * counts recent failures two ways: from this address (one person guessing),
 * and for the check overall (many addresses guessing together). Over either
 * limit, the check refuses before even looking at the guess.
 *
 * Attempts live in `auth_attempts` (migration 055). If that table is missing
 * -- the code deployed before the migration -- the limiter lets the attempt
 * through and reports it, rather than locking every staff member out.
 */

import type { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export type ThrottleScope = 'admin-pin' | 'pos-pin' | 'web-login' | 'staff-login';

export interface ThrottleLimits {
  /** Failures allowed from one address within the window. */
  perAddress: number;
  /** Failures allowed for the whole check within the window. */
  overall: number;
  windowMinutes: number;
}

export const LIMITS: Record<ThrottleScope, ThrottleLimits> = {
  // PINs: few values, so tight limits.
  'admin-pin': { perAddress: 5, overall: 20, windowMinutes: 60 },
  'pos-pin': { perAddress: 5, overall: 20, windowMinutes: 60 },
  // Passwords: far more values, and customers mistype them.
  'web-login': { perAddress: 10, overall: 200, windowMinutes: 15 },
  'staff-login': { perAddress: 5, overall: 30, windowMinutes: 15 },
};

/** Pure: given the recent failure counts, may this attempt proceed? */
export function decideThrottle(
  failuresFromAddress: number,
  failuresOverall: number,
  limits: ThrottleLimits
): { allowed: true } | { allowed: false; reason: 'address' | 'overall' } {
  if (failuresFromAddress >= limits.perAddress) return { allowed: false, reason: 'address' };
  if (failuresOverall >= limits.overall) return { allowed: false, reason: 'overall' };
  return { allowed: true };
}

/** The caller's address as Vercel reports it. */
export function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim();
}

export const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a while and try again.';

/** May this caller try `scope` now? */
export async function checkThrottle(scope: ThrottleScope, ip: string): Promise<boolean> {
  const limits = LIMITS[scope];
  const since = new Date(Date.now() - limits.windowMinutes * 60_000).toISOString();
  const db = createAdminClient();
  try {
    const [fromAddress, overall] = await Promise.all([
      db.from('auth_attempts').select('id', { count: 'exact', head: true })
        .eq('scope', scope).eq('ip', ip).eq('succeeded', false).gte('attempted_at', since),
      db.from('auth_attempts').select('id', { count: 'exact', head: true })
        .eq('scope', scope).eq('succeeded', false).gte('attempted_at', since),
    ]);
    if (fromAddress.error) throw fromAddress.error;
    if (overall.error) throw overall.error;

    const decision = decideThrottle(fromAddress.count ?? 0, overall.count ?? 0, limits);
    if (!decision.allowed) {
      logger.warn({ scope, ip, reason: decision.reason }, 'Login attempt throttled');
      if (decision.reason === 'overall') {
        Sentry.captureMessage(`Login check '${scope}' is under a guessing attack`, { level: 'warning' });
      }
    }
    return decision.allowed;
  } catch (error) {
    logger.error({ error, scope }, 'Login throttle unavailable -- allowing attempt (is migration 055 applied?)');
    Sentry.captureException(error, { tags: { component: 'auth-throttle', scope } });
    return true;
  }
}

/** Record how the attempt went. Never throws: a record failing must not fail a login. */
export async function recordAttempt(scope: ThrottleScope, ip: string, succeeded: boolean): Promise<void> {
  const { error } = await createAdminClient().from('auth_attempts').insert({ scope, ip, succeeded });
  if (error) logger.error({ error, scope }, 'Could not record login attempt');
}
