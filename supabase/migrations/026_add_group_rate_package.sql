-- Add group_rate to party_package_name enum
-- Per issue #209: Group Rate package with $12/child, min 10, max 30
ALTER TYPE party_package_name ADD VALUE IF NOT EXISTS 'group_rate';

-- Update the guest count constraint to allow up to 30 for group rate bookings
ALTER TABLE party_bookings DROP CONSTRAINT IF EXISTS valid_guest_count;
ALTER TABLE party_bookings ADD CONSTRAINT valid_guest_count CHECK (guest_count >= 1 AND guest_count <= 50);
