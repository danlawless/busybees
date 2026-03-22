-- Migration 043: Remove events from get_booked_party_slots
-- Events should not block party booking time slots on the availability calendar.
-- Only actual party bookings should affect availability.

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
  SELECT
    pb.party_date,
    pb.start_time
  FROM party_bookings pb
  WHERE pb.party_date >= start_date
    AND pb.party_date <= end_date
    AND pb.status NOT IN ('cancelled')
  ORDER BY pb.party_date, pb.start_time;
END;
$$;

GRANT EXECUTE ON FUNCTION get_booked_party_slots(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_booked_party_slots(DATE, DATE) TO authenticated;

COMMENT ON FUNCTION get_booked_party_slots IS
  'Returns booked party slots for availability checking.
   Only includes party bookings (events are excluded).
   SECURITY DEFINER bypasses RLS to see all bookings but only returns
   non-sensitive data (dates and times). No PII is exposed.';
