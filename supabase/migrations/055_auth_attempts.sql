-- 055: login attempts, so PIN and password guesses can be slowed and blocked.
--
-- The /admin PIN and the POS device PIN are short; without a limit, a script
-- can try every value. Each check (/api/auth/staff-login, /api/pos/verify-pin,
-- /api/auth/web-login, /api/auth/staff-auth) records its attempt here and
-- refuses while there are too many recent failures from that address, or for
-- that check overall. Each attempt is recorded before it is judged, so a burst
-- of simultaneous guesses cannot slip through together. Written and read only
-- by the server (service role).
-- Apply by hand in the Supabase SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL,          -- which check: 'admin-pin', 'pos-pin', 'web-login', 'web-login-account', 'staff-login'
  ip TEXT NOT NULL,             -- the key counted: an address (IPv6 by /64), or 'user:<id>' per account
  succeeded BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_scope_time
  ON public.auth_attempts (scope, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_scope_ip_time
  ON public.auth_attempts (scope, ip, attempted_at DESC);

-- Service role only: RLS on, no policies.
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;
