-- Migration 034: Add event_date_end to support multi-day events
-- Allows specifying a start date and end date for events (e.g., weekend-long events)
-- event_date remains the start date; event_date_end is optional (NULL = single-day event)

ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date_end DATE;

-- Update the party slot blocking function to cover multi-day events
CREATE OR REPLACE FUNCTION get_booked_party_slots(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  party_date DATE,
  start_time TIME
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Existing party bookings
  SELECT
    pb.party_date,
    pb.start_time
  FROM party_bookings pb
  WHERE pb.party_date >= start_date
    AND pb.party_date <= end_date
    AND pb.status NOT IN ('cancelled')

  UNION ALL

  -- Published events block the same slots (supports multi-day events)
  SELECT
    d::DATE AS party_date,
    e.event_time_start AS start_time
  FROM events e
  CROSS JOIN LATERAL generate_series(
    e.event_date,
    COALESCE(e.event_date_end, e.event_date),
    '1 day'::INTERVAL
  ) AS d
  WHERE d::DATE >= start_date
    AND d::DATE <= end_date
    AND e.status = 'published'

  ORDER BY 1, 2;
END;
$$;

GRANT EXECUTE ON FUNCTION get_booked_party_slots(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_booked_party_slots(DATE, DATE) TO authenticated;

COMMENT ON FUNCTION get_booked_party_slots IS
  'Returns booked party slots for availability checking.
   Includes both party bookings and published events (including multi-day).
   SECURITY DEFINER bypasses RLS to see all bookings but only returns
   non-sensitive data (dates and times). No PII is exposed.';
