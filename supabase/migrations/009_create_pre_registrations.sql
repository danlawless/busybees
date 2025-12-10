-- ==================== PRE-REGISTRATIONS TABLE ====================

-- Pre-registration submissions table for storing family registrations
-- This allows families to pre-register before their first visit without needing auth
-- Data can be linked to actual user accounts later when they sign up
CREATE TABLE public.pre_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  children JSONB NOT NULL DEFAULT '[]', -- Array of {name: string, birthdate: string}
  marketing_opt_in BOOLEAN DEFAULT TRUE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_pre_registrations_email ON public.pre_registrations(email);
CREATE INDEX idx_pre_registrations_phone ON public.pre_registrations(phone);
CREATE INDEX idx_pre_registrations_submitted_at ON public.pre_registrations(submitted_at);

-- Auto-update trigger for updated_at
CREATE TRIGGER update_pre_registrations_updated_at
  BEFORE UPDATE ON public.pre_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== RLS POLICIES ====================

-- Enable RLS on pre_registrations
ALTER TABLE public.pre_registrations ENABLE ROW LEVEL SECURITY;

-- Allow public insert (anyone can submit a pre-registration)
CREATE POLICY "Anyone can submit pre-registration"
  ON public.pre_registrations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only staff/admin can view pre-registrations
CREATE POLICY "Staff and admin can view pre-registrations"
  ON public.pre_registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('staff', 'admin')
    )
  );

-- Only staff/admin can update pre-registrations
CREATE POLICY "Staff and admin can update pre-registrations"
  ON public.pre_registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('staff', 'admin')
    )
  );

-- Only admin can delete pre-registrations
CREATE POLICY "Admin can delete pre-registrations"
  ON public.pre_registrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
