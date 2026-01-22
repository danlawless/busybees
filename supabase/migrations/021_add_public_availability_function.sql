-- ==================== PUBLIC AVAILABILITY FUNCTION ====================
-- Creates a SECURITY DEFINER function that returns booked party slots
-- without exposing any PII. This allows public availability checking
-- while keeping RLS enabled on the party_bookings table.

-- Function to get booked slots for a date range (public access)
-- Returns ONLY dates and times - no customer information
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

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION get_booked_party_slots(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_booked_party_slots(DATE, DATE) TO authenticated;

-- Add comment explaining the function's purpose
COMMENT ON FUNCTION get_booked_party_slots IS
  'Returns booked party slots for availability checking.
   SECURITY DEFINER bypasses RLS to see all bookings but only returns
   non-sensitive data (dates and times). No PII is exposed.';
