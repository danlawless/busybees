-- Migration 035: Create purchase_children junction table for family passes
-- Allows a single purchase (e.g., Monthly Family Pass) to cover multiple children
-- Single-child passes continue using purchases.child_id as before

CREATE TABLE IF NOT EXISTS purchase_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(purchase_id, child_id)
);

-- Index for fast lookups by child and by purchase
CREATE INDEX idx_purchase_children_child ON purchase_children (child_id);
CREATE INDEX idx_purchase_children_purchase ON purchase_children (purchase_id);

-- Enable RLS
ALTER TABLE purchase_children ENABLE ROW LEVEL SECURITY;

-- Staff/admin can manage purchase_children
CREATE POLICY "Staff can manage purchase_children"
  ON purchase_children FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('staff', 'admin')
    )
  );

-- Customers can view their own purchase_children
CREATE POLICY "Customers can view own purchase_children"
  ON purchase_children FOR SELECT
  USING (
    purchase_id IN (
      SELECT id FROM purchases WHERE customer_id = auth.uid()
    )
  );
