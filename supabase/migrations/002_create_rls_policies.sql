-- ==================== ENABLE RLS ====================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volume_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

-- ==================== HELPER FUNCTIONS ====================

-- Function to check if user is staff or admin
CREATE OR REPLACE FUNCTION is_staff_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('staff', 'admin')
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== USERS TABLE POLICIES ====================

-- Customers can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Customers can update their own profile (but not role)
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()));

-- Staff/admin can read all users
CREATE POLICY "Staff can view all users"
  ON public.users FOR SELECT
  USING (is_staff_or_admin());

-- Only admins can update user roles
CREATE POLICY "Admin can update user roles"
  ON public.users FOR UPDATE
  USING (is_admin());

-- New users can be inserted (for signup)
CREATE POLICY "Users can be created"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- ==================== CHILDREN TABLE POLICIES ====================

-- Customers can CRUD their own children
CREATE POLICY "Customers can view own children"
  ON public.children FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own children"
  ON public.children FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own children"
  ON public.children FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can delete own children"
  ON public.children FOR DELETE
  USING (auth.uid() = customer_id);

-- Staff can read all children
CREATE POLICY "Staff can view all children"
  ON public.children FOR SELECT
  USING (is_staff_or_admin());

-- ==================== PASSES TABLE POLICIES ====================

-- Public read access for browsing
CREATE POLICY "Anyone can view active passes"
  ON public.passes FOR SELECT
  USING (is_active = true OR is_staff_or_admin());

-- Only staff/admin can CRUD passes
CREATE POLICY "Staff can insert passes"
  ON public.passes FOR INSERT
  WITH CHECK (is_staff_or_admin());

CREATE POLICY "Staff can update passes"
  ON public.passes FOR UPDATE
  USING (is_staff_or_admin());

CREATE POLICY "Staff can delete passes"
  ON public.passes FOR DELETE
  USING (is_staff_or_admin());

-- ==================== PARTY PACKAGES TABLE POLICIES ====================

-- Public read access for browsing
CREATE POLICY "Anyone can view active party packages"
  ON public.party_packages FOR SELECT
  USING (is_active = true OR is_staff_or_admin());

-- Only staff/admin can CRUD party packages
CREATE POLICY "Staff can insert party packages"
  ON public.party_packages FOR INSERT
  WITH CHECK (is_staff_or_admin());

CREATE POLICY "Staff can update party packages"
  ON public.party_packages FOR UPDATE
  USING (is_staff_or_admin());

CREATE POLICY "Staff can delete party packages"
  ON public.party_packages FOR DELETE
  USING (is_staff_or_admin());

-- ==================== PRODUCTS TABLE POLICIES ====================

-- Public read access for browsing
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true OR is_staff_or_admin());

-- Only staff/admin can CRUD products
CREATE POLICY "Staff can insert products"
  ON public.products FOR INSERT
  WITH CHECK (is_staff_or_admin());

CREATE POLICY "Staff can update products"
  ON public.products FOR UPDATE
  USING (is_staff_or_admin());

CREATE POLICY "Staff can delete products"
  ON public.products FOR DELETE
  USING (is_staff_or_admin());

-- ==================== PURCHASES TABLE POLICIES ====================

-- Customers can read their own purchases
CREATE POLICY "Customers can view own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = customer_id);

-- Staff can read all purchases
CREATE POLICY "Staff can view all purchases"
  ON public.purchases FOR SELECT
  USING (is_staff_or_admin());

-- Staff can create purchases
CREATE POLICY "Staff can create purchases"
  ON public.purchases FOR INSERT
  WITH CHECK (is_staff_or_admin());

-- Only staff can update purchases
CREATE POLICY "Staff can update purchases"
  ON public.purchases FOR UPDATE
  USING (is_staff_or_admin());

-- Staff can delete purchases (for refunds)
CREATE POLICY "Staff can delete purchases"
  ON public.purchases FOR DELETE
  USING (is_staff_or_admin());

-- ==================== SESSIONS TABLE POLICIES ====================

-- Customers can read their own active sessions
CREATE POLICY "Customers can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = customer_id);

-- Staff can CRUD all sessions
CREATE POLICY "Staff can view all sessions"
  ON public.sessions FOR SELECT
  USING (is_staff_or_admin());

CREATE POLICY "Staff can create sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (is_staff_or_admin());

CREATE POLICY "Staff can update sessions"
  ON public.sessions FOR UPDATE
  USING (is_staff_or_admin());

CREATE POLICY "Staff can delete sessions"
  ON public.sessions FOR DELETE
  USING (is_staff_or_admin());

-- ==================== PROMOS TABLE POLICIES ====================

-- Public read access for active promos
CREATE POLICY "Anyone can view active promos"
  ON public.promos FOR SELECT
  USING (
    (is_active = true AND CURRENT_DATE BETWEEN start_date AND end_date)
    OR is_staff_or_admin()
  );

-- Only staff/admin can CRUD promos
CREATE POLICY "Staff can insert promos"
  ON public.promos FOR INSERT
  WITH CHECK (is_staff_or_admin());

CREATE POLICY "Staff can update promos"
  ON public.promos FOR UPDATE
  USING (is_staff_or_admin());

CREATE POLICY "Staff can delete promos"
  ON public.promos FOR DELETE
  USING (is_staff_or_admin());

-- ==================== VOLUME DISCOUNTS TABLE POLICIES ====================

-- Public read access
CREATE POLICY "Anyone can view volume discounts"
  ON public.volume_discounts FOR SELECT
  USING (true);

-- Only staff/admin can CRUD volume discounts
CREATE POLICY "Staff can insert volume discounts"
  ON public.volume_discounts FOR INSERT
  WITH CHECK (is_staff_or_admin());

CREATE POLICY "Staff can update volume discounts"
  ON public.volume_discounts FOR UPDATE
  USING (is_staff_or_admin());

CREATE POLICY "Staff can delete volume discounts"
  ON public.volume_discounts FOR DELETE
  USING (is_staff_or_admin());

-- ==================== SAVED CARDS TABLE POLICIES ====================

-- Customers can CRUD their own saved cards
CREATE POLICY "Customers can view own saved cards"
  ON public.saved_cards FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own saved cards"
  ON public.saved_cards FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own saved cards"
  ON public.saved_cards FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can delete own saved cards"
  ON public.saved_cards FOR DELETE
  USING (auth.uid() = customer_id);

-- Staff CANNOT access customer payment methods (security)

