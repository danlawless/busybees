-- ==================== PARTY TIME SLOTS MIGRATION ====================
-- Creates the party_time_slots table for configurable party booking time slots
-- Allows admin to configure available time slots per party type and day type

-- Day type enum for weekend vs weekday
CREATE TYPE day_type AS ENUM ('weekday', 'weekend');

-- Party time slots table
CREATE TABLE public.party_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Slot Configuration
  party_type party_type NOT NULL,
  day_type day_type NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label TEXT NOT NULL, -- e.g., "1:00 PM - 3:00 PM"

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Ordering for display
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT end_after_start CHECK (end_time > start_time),
  CONSTRAINT unique_slot UNIQUE (party_type, day_type, start_time, end_time)
);

-- Indexes for performance
CREATE INDEX idx_party_time_slots_party_type ON public.party_time_slots(party_type);
CREATE INDEX idx_party_time_slots_day_type ON public.party_time_slots(day_type);
CREATE INDEX idx_party_time_slots_active ON public.party_time_slots(is_active);

-- Update trigger for updated_at
CREATE TRIGGER update_party_time_slots_updated_at
  BEFORE UPDATE ON public.party_time_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== RLS POLICIES ====================

-- Enable RLS
ALTER TABLE public.party_time_slots ENABLE ROW LEVEL SECURITY;

-- Anyone can read time slots (needed for booking form)
CREATE POLICY "Anyone can view time slots"
  ON public.party_time_slots
  FOR SELECT
  USING (true);

-- Only admins can modify time slots
CREATE POLICY "Admins can insert time slots"
  ON public.party_time_slots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update time slots"
  ON public.party_time_slots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete time slots"
  ON public.party_time_slots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==================== SEED DEFAULT TIME SLOTS ====================
-- Insert the current hardcoded time slots as defaults

-- Private party weekend slots
INSERT INTO public.party_time_slots (party_type, day_type, start_time, end_time, label, sort_order) VALUES
  ('private', 'weekend', '13:00', '15:00', '1:00 PM - 3:00 PM', 1),
  ('private', 'weekend', '15:30', '17:30', '3:30 PM - 5:30 PM', 2);

-- Semi-private party weekend slots
INSERT INTO public.party_time_slots (party_type, day_type, start_time, end_time, label, sort_order) VALUES
  ('semi_private', 'weekend', '10:00', '12:00', '10:00 AM - 12:00 PM', 1);

-- Semi-private party weekday slots
INSERT INTO public.party_time_slots (party_type, day_type, start_time, end_time, label, sort_order) VALUES
  ('semi_private', 'weekday', '09:00', '17:00', '9:00 AM - 5:00 PM', 1);

-- ==================== HELPER FUNCTION ====================

-- Function to get available time slots for a date and party type
-- This will be used by the booking system instead of hardcoded values
CREATE OR REPLACE FUNCTION get_configurable_party_slots(
  check_date DATE,
  p_party_type party_type
)
RETURNS TABLE (
  start_time TIME,
  end_time TIME,
  label TEXT
) AS $$
DECLARE
  day_of_week INTEGER;
  v_day_type day_type;
BEGIN
  day_of_week := EXTRACT(DOW FROM check_date);

  -- Determine day type (0 = Sunday, 6 = Saturday)
  IF day_of_week IN (0, 6) THEN
    v_day_type := 'weekend';
  ELSE
    v_day_type := 'weekday';
  END IF;

  RETURN QUERY
  SELECT pts.start_time, pts.end_time, pts.label
  FROM public.party_time_slots pts
  WHERE pts.party_type = p_party_type
    AND pts.day_type = v_day_type
    AND pts.is_active = true
  ORDER BY pts.sort_order, pts.start_time;
END;
$$ LANGUAGE plpgsql;
