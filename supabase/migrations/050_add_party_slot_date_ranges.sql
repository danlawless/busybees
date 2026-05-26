-- ==================== PARTY TIME SLOT DATE RANGES ====================
-- Adds support for date-bound and specific-day-of-week party time slots so
-- the schedule can be overridden for special periods (e.g. Summer Hours).
--
-- Semantics enforced in the API layer:
--   * A slot whose effective_start_date/end_date fall around a given date is
--     a "date-range override" and HIDES default slots for that date entirely.
--   * day_of_week (0=Sun .. 6=Sat) narrows a slot to a single weekday. NULL
--     means the slot applies to every day matching day_type.
--   * Default slots have both effective dates NULL and day_of_week NULL.

-- New columns
ALTER TABLE public.party_time_slots
  ADD COLUMN IF NOT EXISTS effective_start_date DATE,
  ADD COLUMN IF NOT EXISTS effective_end_date DATE,
  ADD COLUMN IF NOT EXISTS day_of_week INTEGER;

-- Validation constraints
ALTER TABLE public.party_time_slots
  ADD CONSTRAINT day_of_week_valid
  CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6));

ALTER TABLE public.party_time_slots
  ADD CONSTRAINT effective_dates_both_or_neither
  CHECK ((effective_start_date IS NULL) = (effective_end_date IS NULL));

ALTER TABLE public.party_time_slots
  ADD CONSTRAINT effective_end_after_start
  CHECK (effective_end_date IS NULL OR effective_end_date >= effective_start_date);

-- Cross-reference: day_of_week must agree with day_type when both set
-- (weekend -> 0 or 6; weekday -> 1..5)
ALTER TABLE public.party_time_slots
  ADD CONSTRAINT day_of_week_matches_day_type
  CHECK (
    day_of_week IS NULL
    OR (day_type = 'weekend' AND day_of_week IN (0, 6))
    OR (day_type = 'weekday' AND day_of_week BETWEEN 1 AND 5)
  );

-- Index to speed up "is this date inside any override?" queries
CREATE INDEX IF NOT EXISTS idx_party_time_slots_effective_range
  ON public.party_time_slots(effective_start_date, effective_end_date)
  WHERE effective_start_date IS NOT NULL;

-- Replace unique_slot with one that includes the new fields so multiple
-- overrides at the same (party_type, day_type, start_time, end_time) are
-- allowed across different date ranges / specific days.
ALTER TABLE public.party_time_slots DROP CONSTRAINT IF EXISTS unique_slot;
ALTER TABLE public.party_time_slots
  ADD CONSTRAINT unique_slot
  UNIQUE (party_type, day_type, start_time, end_time, effective_start_date, effective_end_date, day_of_week);

-- ==================== SUMMER HOURS 2026 ====================
-- Jun 29 -> Aug 30, 2026. Only the configured semi-private slots run during
-- this window; all default weekend/weekday slots are suppressed by the API.
INSERT INTO public.party_time_slots (
  party_type, day_type, day_of_week,
  start_time, end_time, label,
  effective_start_date, effective_end_date,
  sort_order
) VALUES
  -- Saturdays
  ('semi_private', 'weekend', 6,
    '13:00', '16:00', '1:00 PM - 4:00 PM (Summer Hours)',
    '2026-06-29', '2026-08-30',
    10),
  -- Sundays
  ('semi_private', 'weekend', 0,
    '13:00', '15:00', '1:00 PM - 3:00 PM (Summer Hours)',
    '2026-06-29', '2026-08-30',
    10);
