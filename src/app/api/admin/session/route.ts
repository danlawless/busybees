import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { resolvePinLevel } from '@/lib/admin/pin-login';
import { clientKeyFrom, createRateLimiter, gateAttempt } from '@/lib/admin/rate-limit';
import { SHARED_ACCOUNTS, loadPinHashes } from '@/lib/admin/shared-accounts';
import { STAMP_COOKIE, readStamp, signStamp, stampCookieOptions } from '@/lib/admin/session-stamp';
import { liveAdminLevel } from '@/lib/admin/access';
import { getAdminLevel } from '@/lib/admin/guard';
import { logger } from '@/lib/logger';

// Per-instance limiter. A cold start resets it; acceptable for v1 (spec 5.2).
const limiter = createRateLimiter({ max: 5, windowMs: 10 * 60_000, lockMs: 10 * 60_000 });

// Shop-wide cap so rotating client identities cannot escape the per-client limit.
// Trade-off: a shop-wide lock (PIN login refused for everyone for 10 minutes) now
// needs at least 10 distinct clients, since a locked client no longer spends this
// budget. Accepted: 10,000 codes make an uncapped guesser the worse risk.
const globalLimiter = createRateLimiter({ max: 50, windowMs: 10 * 60_000, lockMs: 10 * 60_000 });

function sessionClient(req: NextRequest, res: NextResponse) {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: list => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
}

/**
 * Is there a live admin session? 200 { level } only when users.role is staff/admin
 * AND the signed bb_admin_started stamp is valid and within MAX_SESSION_MS.
 * The POS calls this before restoring staff mode from a remembered login.
 */
export async function GET(req: NextRequest) {
  const role = await getAdminLevel();
  const stampSecret = process.env.ADMIN_SESSION_SECRET;
  const startedAt = stampSecret ? await readStamp(req.cookies.get(STAMP_COOKIE)?.value, stampSecret) : null;
  const level = liveAdminLevel({ role, startedAt, now: Date.now() });
  if (!level) return NextResponse.json({ error: 'session-ended' }, { status: 401 });
  return NextResponse.json({ level });
}

export async function POST(req: NextRequest) {
  const key = clientKeyFrom(req.headers);
  // Record the attempt before any await so parallel bursts cannot outrun the limits.
  const gate = gateAttempt(limiter, globalLimiter, key);
  if (!gate.allowed) {
    return NextResponse.json({ error: 'locked', retryAfterSeconds: Math.ceil(gate.retryAfterMs / 1000) }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const pin = typeof body?.pin === 'string' ? body.pin : '';
  if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  let hashes: Awaited<ReturnType<typeof loadPinHashes>>;
  try {
    hashes = await loadPinHashes();
  } catch (error) {
    logger.error({ error }, 'Could not read PIN hashes');
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }
  if (!hashes.admin && !hashes.staff) return NextResponse.json({ error: 'no-pin' }, { status: 503 });

  const level = await resolvePinLevel(pin, hashes);
  if (!level) {
    logger.warn({ remaining: gate.remaining }, 'Admin PIN mismatch');
    return NextResponse.json({ error: 'mismatch', remaining: gate.remaining }, { status: 401 });
  }
  limiter.reset(key); // per-client only: a correct login must not wipe the shop-wide budget

  const account = SHARED_ACCOUNTS[level];
  const password = process.env[account.passwordEnv];
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !secret) {
    logger.error({ level }, 'Admin session env missing');
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }

  const res = NextResponse.json({ level });
  const supabase = sessionClient(req, res);
  await supabase.auth.signOut({ scope: 'local' }); // upgrade path: drop the staff session first
  const { error } = await supabase.auth.signInWithPassword({ email: account.email, password });
  if (error) {
    logger.error({ error, level }, 'Shared account sign-in failed');
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }
  res.cookies.set(STAMP_COOKIE, await signStamp(Date.now(), secret), stampCookieOptions());
  logger.info({ level }, 'Admin session started');
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  await sessionClient(req, res).auth.signOut({ scope: 'local' });
  res.cookies.set(STAMP_COOKIE, '', { ...stampCookieOptions(), maxAge: 0 });
  return res;
}
