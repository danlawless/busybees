-- Migration 054: party shifts in 7shifts
--
-- One row per open shift created in 7shifts for a party (two per party).
-- The sync job (/api/cron/sync-party-shifts) is the only writer.
-- See docs/superpowers/specs/2026-10-01-party-shifts-7shifts-design.md.

BEGIN;

CREATE TABLE IF NOT EXISTS public.party_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_booking_id UUID NOT NULL REFERENCES public.party_bookings(id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot IN (1, 2)),
  -- Null while a create is in flight; the next run adopts the shift by its note tag.
  seven_shifts_shift_id BIGINT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'deleted')),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (party_booking_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_party_shifts_booking ON public.party_shifts(party_booking_id);

ALTER TABLE public.party_shifts ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

-- A lease rather than an advisory lock: advisory locks do not survive
-- PostgREST's connection pooling, so two overlapping runs could both "hold" one.
CREATE TABLE IF NOT EXISTS public.sync_leases (
  name TEXT PRIMARY KEY,
  held_until TIMESTAMPTZ NOT NULL DEFAULT 'epoch'
);
ALTER TABLE public.sync_leases ENABLE ROW LEVEL SECURITY;

INSERT INTO public.sync_leases (name) VALUES ('party_shifts') ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.try_acquire_sync_lease(p_name TEXT, p_seconds INT)
RETURNS BOOLEAN
LANGUAGE sql
AS $$
  WITH taken AS (
    UPDATE public.sync_leases
    SET held_until = NOW() + make_interval(secs => p_seconds)
    WHERE name = p_name AND held_until < NOW()
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM taken);
$$;

CREATE OR REPLACE FUNCTION public.release_sync_lease(p_name TEXT)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE public.sync_leases SET held_until = 'epoch' WHERE name = p_name;
$$;

REVOKE EXECUTE ON FUNCTION public.try_acquire_sync_lease(TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_sync_lease(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_acquire_sync_lease(TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_sync_lease(TEXT) TO service_role;

COMMIT;
