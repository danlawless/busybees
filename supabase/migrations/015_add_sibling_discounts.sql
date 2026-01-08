-- Migration: Add sibling discounts configuration table
-- Purpose: Allow admin to configure progressive discounts for monthly memberships

-- Create sibling_discounts table
CREATE TABLE IF NOT EXISTS public.sibling_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_position INTEGER NOT NULL CHECK (child_position >= 2 AND child_position <= 10),
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  applies_to_monthly_only BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_position)
);

-- Add comment explaining the table
COMMENT ON TABLE public.sibling_discounts IS 'Configuration for sibling/multi-child discounts. child_position=2 means 2nd child, etc.';
COMMENT ON COLUMN public.sibling_discounts.child_position IS 'Position of child (2=second child, 3=third child, etc.)';
COMMENT ON COLUMN public.sibling_discounts.discount_percent IS 'Discount percentage to apply (0-100)';
COMMENT ON COLUMN public.sibling_discounts.applies_to_monthly_only IS 'If true, only applies to monthly memberships';

-- Create index for quick lookups
CREATE INDEX idx_sibling_discounts_active ON public.sibling_discounts(is_active, child_position);

-- Create trigger for updated_at
CREATE TRIGGER update_sibling_discounts_updated_at BEFORE UPDATE ON public.sibling_discounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default discount configuration (2nd child 10%, 3rd 20%, 4th 30%, 5th 40%)
INSERT INTO public.sibling_discounts (child_position, discount_percent, is_active, applies_to_monthly_only)
VALUES
  (2, 10, true, true),
  (3, 20, true, true),
  (4, 30, true, true),
  (5, 40, true, true)
ON CONFLICT (child_position) DO UPDATE SET
  discount_percent = EXCLUDED.discount_percent,
  is_active = EXCLUDED.is_active,
  applies_to_monthly_only = EXCLUDED.applies_to_monthly_only;

-- RLS Policies
ALTER TABLE public.sibling_discounts ENABLE ROW LEVEL SECURITY;

-- Staff and admin can read
CREATE POLICY "Staff and admin can read sibling discounts"
  ON public.sibling_discounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('staff', 'admin')
    )
  );

-- Only admin can modify
CREATE POLICY "Admin can modify sibling discounts"
  ON public.sibling_discounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
