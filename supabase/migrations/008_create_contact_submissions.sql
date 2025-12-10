-- ==================== CONTACT SUBMISSIONS TABLE ====================

-- Contact form submissions table for storing all contact inquiries
-- This ensures no contact form data is lost even if email service fails
CREATE TABLE public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  user_type TEXT NOT NULL,
  message TEXT NOT NULL,
  email_sent BOOLEAN DEFAULT FALSE,
  email_error TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_contact_submissions_email ON public.contact_submissions(email);
CREATE INDEX idx_contact_submissions_user_type ON public.contact_submissions(user_type);
CREATE INDEX idx_contact_submissions_submitted_at ON public.contact_submissions(submitted_at);
CREATE INDEX idx_contact_submissions_email_sent ON public.contact_submissions(email_sent);

-- Auto-update trigger for updated_at
CREATE TRIGGER update_contact_submissions_updated_at
  BEFORE UPDATE ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== RLS POLICIES ====================

-- Enable RLS on contact_submissions
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow public insert (anyone can submit a contact form)
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only staff/admin can view contact submissions
CREATE POLICY "Staff and admin can view contact submissions"
  ON public.contact_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('staff', 'admin')
    )
  );

-- Only staff/admin can update contact submissions
CREATE POLICY "Staff and admin can update contact submissions"
  ON public.contact_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('staff', 'admin')
    )
  );

-- Only admin can delete contact submissions
CREATE POLICY "Admin can delete contact submissions"
  ON public.contact_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
