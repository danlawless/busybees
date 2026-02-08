-- Migration 029: Update get_booked_party_slots to include published events
-- When a special event is published, it blocks the same time slot on the
-- party booking calendar so customers can't double-book during an event.

CREATE OR REPLACE FUNCTION get_booked_party_slots(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  party_date DATE,
  start_time TIME
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with owner privileges, bypassing RLS
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

  -- Published events block the same slots
  SELECT
    e.event_date AS party_date,
    e.event_time_start AS start_time
  FROM events e
  WHERE e.event_date >= start_date
    AND e.event_date <= end_date
    AND e.status = 'published'

  ORDER BY 1, 2;
END;
$$;

-- Re-grant permissions (CREATE OR REPLACE preserves them, but explicit is safer)
GRANT EXECUTE ON FUNCTION get_booked_party_slots(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_booked_party_slots(DATE, DATE) TO authenticated;

COMMENT ON FUNCTION get_booked_party_slots IS
  'Returns booked party slots for availability checking.
   Includes both party bookings and published events.
   SECURITY DEFINER bypasses RLS to see all bookings but only returns
   non-sensitive data (dates and times). No PII is exposed.';
