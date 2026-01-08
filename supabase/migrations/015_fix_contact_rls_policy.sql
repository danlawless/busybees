-- ==================== FIX CONTACT SUBMISSIONS RLS POLICY ====================
--
-- The original policy used "TO public" which refers to the PostgreSQL public role.
-- In Supabase, anonymous users connect with the "anon" role, not "public".
-- This migration updates the policy to explicitly allow anon and authenticated users.
--

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;

-- Create new policy that explicitly allows anon and authenticated users to insert
-- This ensures the contact form works for all website visitors
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also fix newsletter_subscribers for consistency
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;

CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
