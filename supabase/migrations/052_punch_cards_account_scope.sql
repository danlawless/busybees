-- Migration 052: Punch cards belong to the account, not one child
--
-- A punch card is bought for the account from 1 October 2026, and any child on
-- that account may spend a punch. Two things follow:
--
--   1. Scope has to be explicit. `child_id IS NULL` will not do the job:
--      purchases.child_id is ON DELETE SET NULL, so deleting a child would
--      silently convert their old locked cards to account-wide.
--   2. Sessions have to record the child. Three children inside on one card are
--      otherwise indistinguishable, and "who is in the building?" becomes
--      unanswerable.
--
-- The punch also moves from check-out to check-in, so that
-- total_sessions - used_sessions stays truthful while children are inside.

BEGIN;

-- The sessions/purchases ALTER below takes ACCESS EXCLUSIVE and would otherwise
-- queue behind any open transaction, freezing POS check-in while it waits.
-- Abort instead of hanging the front desk.
SET LOCAL lock_timeout = '5s';

-- ==================== Scope ====================
-- Everything already sold takes 'child', so tiered cards sold before
-- 1 October keep working exactly as they do now until they age out.

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS pass_scope TEXT NOT NULL DEFAULT 'child';

ALTER TABLE public.purchases
  DROP CONSTRAINT IF EXISTS purchases_pass_scope_check;

ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_pass_scope_check
  CHECK (pass_scope IN ('child', 'account'));

-- ==================== Sessions record the child ====================

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

UPDATE public.sessions s
SET child_id = p.child_id
FROM public.purchases p
WHERE s.purchase_id = p.id
  AND s.child_id IS NULL
  AND p.child_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_child ON public.sessions(child_id);

-- ==================== Count the open sessions ====================
-- These have not been counted yet: today a punch is spent on check-out. Once
-- the trigger moves to check-in they never would be. Count them once, here,
-- before the old trigger goes.
--
-- Guarded on the new trigger's existence, which this same transaction creates
-- below: if this file is re-pasted after a dropped connection or an ambiguous
-- result, the trigger already exists, so this block is skipped and no card is
-- charged a second punch for a session the new trigger already counted.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'consume_session_on_checkin'
      AND tgrelid = 'public.sessions'::regclass
  ) THEN
    WITH open_counts AS (
      SELECT purchase_id, COUNT(*) AS n
      FROM public.sessions
      WHERE end_time IS NULL
      GROUP BY purchase_id
    )
    UPDATE public.purchases p
    SET
      used_sessions = COALESCE(p.used_sessions, 0) + oc.n,
      status = CASE
        WHEN p.status = 'active' AND COALESCE(p.used_sessions, 0) + oc.n >= p.total_sessions
          THEN 'used'::purchase_status
        ELSE p.status
      END,
      updated_at = NOW()
    FROM open_counts oc
    WHERE p.id = oc.purchase_id;
  END IF;
END $$;

-- ==================== The punch moves to check-in ====================
-- update_purchase_session_count() (the function behind the trigger dropped
-- below) is deliberately left in place but unused from here on — nothing
-- calls it anymore, so don't go hunting for where it fires.

DROP TRIGGER IF EXISTS update_purchase_sessions ON public.sessions;

CREATE OR REPLACE FUNCTION consume_session_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.purchases
  SET
    used_sessions = COALESCE(used_sessions, 0) + 1,
    status = CASE
      WHEN status = 'active' AND COALESCE(used_sessions, 0) + 1 >= total_sessions
        THEN 'used'::purchase_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.purchase_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS consume_session_on_checkin ON public.sessions;
CREATE TRIGGER consume_session_on_checkin
  AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION consume_session_on_checkin();

-- ==================== Voiding a check-in gives the punch back ====================
-- There was no undo before: check-out was the only way to end a session, and
-- check-out was what spent the punch. With three punches going at once a
-- mis-tap costs three times as much.

CREATE OR REPLACE FUNCTION restore_session_on_void()
RETURNS TRIGGER AS $$
DECLARE
  remaining_used INTEGER;
BEGIN
  -- A completed visit is not a mis-tap. Only an open session can be voided,
  -- which is exactly what DELETE /api/sessions/[id] permits — deleting a
  -- closed (historical) session must not refund a punch that was genuinely
  -- spent weeks ago.
  IF OLD.end_time IS NOT NULL THEN
    RETURN OLD;
  END IF;

  -- The purchase may already be gone: deleting a purchase cascades to its
  -- sessions (sessions.purchase_id is ON DELETE CASCADE) and fires this
  -- trigger. Nothing to give back in that case.
  IF NOT EXISTS (SELECT 1 FROM public.purchases WHERE id = OLD.purchase_id) THEN
    RETURN OLD;
  END IF;

  UPDATE public.purchases
  SET
    used_sessions = GREATEST(COALESCE(used_sessions, 0) - 1, 0),
    status = CASE
      WHEN status = 'used' AND COALESCE(used_sessions, 0) - 1 < total_sessions
        THEN 'active'::purchase_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = OLD.purchase_id
  RETURNING used_sessions INTO remaining_used;

  -- A card voided back to nothing should not keep the clock its first use
  -- started, or a mis-tap would quietly burn 90 days of a brand new card.
  IF remaining_used = 0 THEN
    UPDATE public.purchases
    SET first_use_date = NULL, actual_expiry_date = NULL, updated_at = NOW()
    WHERE id = OLD.purchase_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS restore_session_on_void ON public.sessions;
CREATE TRIGGER restore_session_on_void
  AFTER DELETE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION restore_session_on_void();

-- ==================== Active sessions name the right child ====================
-- get_active_sessions joined children through the purchase. With several
-- children playing on one account punch card that returns the wrong name, so it
-- reads the child from the session instead. Signature and SECURITY DEFINER are
-- unchanged — only the join moves.

CREATE OR REPLACE FUNCTION get_active_sessions(customer_uuid UUID)
RETURNS TABLE (
  id UUID,
  purchase_id UUID,
  purchase_name TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  auto_checkout_time TIMESTAMP WITH TIME ZONE,
  child_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.purchase_id,
    p.name AS purchase_name,
    s.start_time,
    s.auto_checkout_time,
    c.name AS child_name
  FROM public.sessions s
  JOIN public.purchases p ON s.purchase_id = p.id
  LEFT JOIN public.children c ON s.child_id = c.id
  WHERE s.customer_id = customer_uuid
    AND s.end_time IS NULL
  ORDER BY s.start_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
