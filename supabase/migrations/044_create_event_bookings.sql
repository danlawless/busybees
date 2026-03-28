-- Generic Event Bookings System
-- Extends events table with bookability and creates event_bookings table

-- Add bookability columns to existing events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_bookable BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_capacity INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS pass_ids UUID[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS booking_instructions TEXT;

-- Create event_bookings table (follows after_dark_bookings pattern)
CREATE TABLE IF NOT EXISTS event_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  customer_id UUID NOT NULL,
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_phone TEXT,
  num_children INTEGER NOT NULL DEFAULT 1,
  child_details JSONB,  -- [{child_id, name, age, pass_id, purchase_id}]
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',  -- confirmed, cancelled, refunded
  total_amount NUMERIC(10,2),
  stripe_payment_intent_id TEXT,
  purchase_ids UUID[],  -- references purchases.id for check-in compatibility
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_bookings_event_id ON event_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_event_date ON event_bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_event_bookings_customer ON event_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_status ON event_bookings(status);
