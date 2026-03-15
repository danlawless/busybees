-- Party Guests table for tracking guest lists per party booking
CREATE TABLE public.party_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.party_bookings(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  age INTEGER,
  waiver_signed BOOLEAN DEFAULT FALSE,
  waiver_signed_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_party_guests_booking ON public.party_guests(booking_id);

-- RLS
ALTER TABLE public.party_guests ENABLE ROW LEVEL SECURITY;

-- Admin/staff can do everything (bypass via admin client)
CREATE POLICY "Service role full access on party_guests"
  ON public.party_guests
  FOR ALL
  USING (true)
  WITH CHECK (true);
