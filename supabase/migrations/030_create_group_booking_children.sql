-- Migration: Create group_booking_children junction table
-- Supports the Group Rate package ($12/child, min 10, max 30)
-- Allows POS staff to assign children to group bookings

-- Add group_rate to package_name enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'group_rate'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'package_name')
  ) THEN
    ALTER TYPE package_name ADD VALUE 'group_rate';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- package_name type may not exist as an enum (could be text column)
    NULL;
END $$;

-- Create group_booking_children junction table
CREATE TABLE IF NOT EXISTS group_booking_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES party_bookings(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_new_child BOOLEAN NOT NULL DEFAULT FALSE,
  waiver_signed_at_booking BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, child_id)
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_group_booking_children_booking_id
  ON group_booking_children(booking_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_children_child_id
  ON group_booking_children(child_id);

-- Enable RLS
ALTER TABLE group_booking_children ENABLE ROW LEVEL SECURITY;

-- Staff/admin full access
CREATE POLICY "Staff and admins can manage group booking children"
  ON group_booking_children
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('staff', 'admin')
    )
  );

-- Customers can read their own booking's children
CREATE POLICY "Customers can view their own group booking children"
  ON group_booking_children
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM party_bookings
      WHERE party_bookings.id = group_booking_children.booking_id
      AND party_bookings.customer_id = auth.uid()
    )
  );

-- Service role bypass (for admin API operations)
CREATE POLICY "Service role has full access to group booking children"
  ON group_booking_children
  FOR ALL
  USING (auth.role() = 'service_role');
