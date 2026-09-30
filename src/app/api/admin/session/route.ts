import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { resolvePinLevel } from '@/lib/admin/pin-login';
import { createRateLimiter } from '@/lib/admin/rate-limit';
import { SHARED_ACCOUNTS, loadPinHashes } from '@/lib/admin/shared-accounts';
import { STAMP_COOKIE, signStamp, stampCookieOptions } from '@/lib/admin/session-stamp';
import { logger } from '@/lib/logger';

// Per-instance limiter. A cold start resets it; acceptable for v1 (spec 5.2).
const limiter = createRateLimiter({ max: 5, windowMs: 10 * 60_000, lockMs: 10 * 60_000 });

function clientKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function sessionClient(req: NextRequest, res: NextResponse) {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: list => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
}

export async function POST(req: NextRequest) {
  const key = clientKey(req);
  const gate = limiter.check(key);
  if (!gate.allowed) {
    return NextResponse.json({ error: 'locked', retryAfterSeconds: Math.ceil(gate.retryAfterMs / 1000) }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const pin = typeof body?.pin === 'string' ? body.pin : '';
  if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const hashes = await loadPinHashes();
  if (!hashes.admin && !hashes.staff) return NextResponse.json({ error: 'no-pin' }, { status: 503 });

  const level = await resolvePinLevel(pin, hashes);
  if (!level) {
    const remaining = limiter.fail(key);
    logger.warn({ remaining }, 'Admin PIN mismatch');
    return NextResponse.json({ error: 'mismatch', remaining }, { status: 401 });
  }
  limiter.reset(key);

  const account = SHARED_ACCOUNTS[level];
  const password = process.env[account.passwordEnv];
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !secret) {
    logger.error({ level }, 'Admin session env missing');
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }

  const res = NextResponse.json({ level });
  const supabase = sessionClient(req, res);
  await supabase.auth.signOut(); // upgrade path: drop the staff session first
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
  await sessionClient(req, res).auth.signOut();
  res.cookies.set(STAMP_COOKIE, '', { ...stampCookieOptions(), maxAge: 0 });
  return res;
}
