-- 056: two database rules that let a signed-in person raise their own access.
--
-- 1. public.users had an INSERT policy WITH CHECK (true) (migration 002). Anyone
--    holding a Supabase session with no users row yet -- e.g. after calling
--    auth.signUp with the public anon key -- could insert their own row with
--    role 'admin'. Every real account is created by a server route with the
--    service role, which RLS does not apply to, so the policy is simply dropped.
--
-- 2. Staff could SELECT every settings row (migration 004), including the
--    /admin PIN (staff_pin), which unlocks the shared admin account. Staff keep
--    reading everything else; the PINs are now admin-only. The POS reads them
--    only through server routes, which use the service role.
--
-- Apply by hand in the Supabase SQL Editor. Safe to re-run.

DROP POLICY IF EXISTS "Users can be created" ON public.users;

DROP POLICY IF EXISTS "Staff can view settings" ON public.settings;
CREATE POLICY "Staff can view settings"
  ON public.settings FOR SELECT
  USING (
    is_admin()
    OR (is_staff_or_admin() AND key NOT IN ('staff_pin', 'pos_access_pin', 'admin_pin'))
  );
