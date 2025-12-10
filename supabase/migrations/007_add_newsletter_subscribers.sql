-- ==================== NEWSLETTER SUBSCRIBERS TABLE ====================

-- Newsletter subscribers table for storing email signups
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  source TEXT NOT NULL DEFAULT 'website', -- website, signup, login, party_booking, pre_register
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);
CREATE INDEX idx_newsletter_subscribers_active ON public.newsletter_subscribers(is_active);
CREATE INDEX idx_newsletter_subscribers_source ON public.newsletter_subscribers(source);

-- Auto-update trigger
CREATE TRIGGER update_newsletter_subscribers_updated_at
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== RLS POLICIES ====================

-- Enable RLS on newsletter_subscribers
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow public insert (anyone can subscribe)
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only staff/admin can view subscribers
CREATE POLICY "Staff and admin can view subscribers"
  ON public.newsletter_subscribers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('staff', 'admin')
    )
  );

-- Only staff/admin can update subscribers
CREATE POLICY "Staff and admin can update subscribers"
  ON public.newsletter_subscribers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('staff', 'admin')
    )
  );

-- Only admin can delete subscribers
CREATE POLICY "Admin can delete subscribers"
  ON public.newsletter_subscribers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
