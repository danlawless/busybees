-- ==================== PARTY BOOKINGS MIGRATION ====================
-- Creates the party_bookings table for tracking party reservations
-- and preventing double-bookings

-- Booking status enum
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Party type enum
CREATE TYPE party_type AS ENUM ('private', 'semi_private');

-- Party package name enum (per issue requirements)
CREATE TYPE party_package_name AS ENUM ('queen_bee', 'worker_bee', 'basic_bee');

-- Party bookings table
CREATE TABLE public.party_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact Information
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,

  -- Party Details
  party_type party_type NOT NULL,
  package_name party_package_name NOT NULL,
  party_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Guest Information
  child_name TEXT NOT NULL,
  child_age INTEGER,
  guest_count INTEGER NOT NULL DEFAULT 15,
  additional_kids INTEGER NOT NULL DEFAULT 0,

  -- Pricing
  base_price NUMERIC(10,2) NOT NULL,
  additional_kids_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL,

  -- Booking Status
  status booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,

  -- Stripe Integration
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  payment_status TEXT DEFAULT 'unpaid',

  -- Linked User (optional - for logged in customers)
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_guest_count CHECK (guest_count >= 1 AND guest_count <= 50),
  CONSTRAINT valid_additional_kids CHECK (additional_kids >= 0),
  CONSTRAINT valid_party_date CHECK (party_date >= CURRENT_DATE),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- Indexes for performance
CREATE INDEX idx_party_bookings_date ON public.party_bookings(party_date);
CREATE INDEX idx_party_bookings_status ON public.party_bookings(status);
CREATE INDEX idx_party_bookings_customer_id ON public.party_bookings(customer_id);
CREATE INDEX idx_party_bookings_payment_intent ON public.party_bookings(stripe_payment_intent_id);
CREATE INDEX idx_party_bookings_checkout_session ON public.party_bookings(stripe_checkout_session_id);

-- Unique constraint to prevent double booking
CREATE UNIQUE INDEX idx_party_bookings_no_double_booking
  ON public.party_bookings(party_date, start_time, end_time)
  WHERE status NOT IN ('cancelled');

-- Update trigger for updated_at
CREATE TRIGGER update_party_bookings_updated_at
  BEFORE UPDATE ON public.party_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== RLS POLICIES ====================

-- Enable RLS
ALTER TABLE public.party_bookings ENABLE ROW LEVEL SECURITY;

-- Public can insert bookings (for non-logged-in users)
CREATE POLICY "Anyone can create party bookings"
  ON public.party_bookings
  FOR INSERT
  WITH CHECK (true);

-- Customers can view their own bookings
CREATE POLICY "Customers can view own bookings"
  ON public.party_bookings
  FOR SELECT
  USING (
    customer_id = auth.uid() OR
    customer_email = (SELECT email FROM public.users WHERE id = auth.uid())
  );

-- Staff and admins can view all bookings
CREATE POLICY "Staff can view all bookings"
  ON public.party_bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- Staff and admins can update bookings
CREATE POLICY "Staff can update bookings"
  ON public.party_bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- Admins can delete bookings
CREATE POLICY "Admins can delete bookings"
  ON public.party_bookings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==================== HELPER FUNCTIONS ====================

-- Function to check if a time slot is available
CREATE OR REPLACE FUNCTION check_party_availability(
  check_date DATE,
  check_start_time TIME,
  check_end_time TIME
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.party_bookings
    WHERE party_date = check_date
      AND status NOT IN ('cancelled')
      AND (
        (start_time <= check_start_time AND end_time > check_start_time) OR
        (start_time < check_end_time AND end_time >= check_end_time) OR
        (start_time >= check_start_time AND end_time <= check_end_time)
      )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get available slots for a date
CREATE OR REPLACE FUNCTION get_available_party_slots(check_date DATE)
RETURNS TABLE (
  slot_start TIME,
  slot_end TIME,
  party_type party_type,
  is_available BOOLEAN
) AS $$
DECLARE
  day_of_week INTEGER;
BEGIN
  day_of_week := EXTRACT(DOW FROM check_date);

  -- Return available slots based on day of week
  -- Friday = 5, Saturday = 6, Sunday = 0

  IF day_of_week = 5 THEN
    -- Friday: Semi-Private only (3-5 PM)
    RETURN QUERY
    SELECT
      '15:00'::TIME as slot_start,
      '17:00'::TIME as slot_end,
      'semi_private'::party_type as party_type,
      check_party_availability(check_date, '15:00'::TIME, '17:00'::TIME) as is_available;

  ELSIF day_of_week IN (0, 6) THEN
    -- Saturday & Sunday: Both types available
    -- Semi-Private: 10 AM - 12 PM
    RETURN QUERY
    SELECT
      '10:00'::TIME as slot_start,
      '12:00'::TIME as slot_end,
      'semi_private'::party_type as party_type,
      check_party_availability(check_date, '10:00'::TIME, '12:00'::TIME) as is_available;

    -- Private: 1-3 PM
    RETURN QUERY
    SELECT
      '13:00'::TIME as slot_start,
      '15:00'::TIME as slot_end,
      'private'::party_type as party_type,
      check_party_availability(check_date, '13:00'::TIME, '15:00'::TIME) as is_available;

    -- Private: 3:30-5:30 PM
    RETURN QUERY
    SELECT
      '15:30'::TIME as slot_start,
      '17:30'::TIME as slot_end,
      'private'::party_type as party_type,
      check_party_availability(check_date, '15:30'::TIME, '17:30'::TIME) as is_available;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql;
