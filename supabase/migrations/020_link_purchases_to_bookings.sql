-- Migration: Link purchases to party_bookings
-- Purpose: Allow tracking which purchase triggered a party_booking

-- Add purchase_id column to party_bookings table
-- This enables syncing party bookings created from customer dashboard purchases
ALTER TABLE party_bookings
ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL;

-- Add index for faster lookups when checking if booking exists for a purchase
CREATE INDEX IF NOT EXISTS idx_party_bookings_purchase_id ON party_bookings(purchase_id) WHERE purchase_id IS NOT NULL;

-- Add comment explaining the relationship
COMMENT ON COLUMN party_bookings.purchase_id IS 'Links to the purchases table when a booking is created from a customer dashboard party purchase';
