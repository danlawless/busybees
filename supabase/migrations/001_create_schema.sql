-- ==================== ENUMS ====================

CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin');
CREATE TYPE pass_category AS ENUM ('day', 'weekly', 'monthly');
CREATE TYPE product_category AS ENUM ('food', 'beverage', 'retail');
CREATE TYPE purchase_type AS ENUM ('day_pass', 'weekly_pass', 'monthly_pass', 'party_package', 'food_beverage');
CREATE TYPE purchase_status AS ENUM ('active', 'expired', 'used');
CREATE TYPE product_type AS ENUM ('pass', 'party', 'product');
CREATE TYPE banner_style AS ENUM ('honeycomb', 'gradient-wave', 'confetti', 'minimal', 'bold-stripes');

-- ==================== TABLES ====================

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'customer',
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_users_role ON public.users(role);

-- Children table
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birthdate DATE NOT NULL,
  waiver_signed BOOLEAN DEFAULT FALSE,
  waiver_signed_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_children_customer ON public.children(customer_id);

-- Passes table
CREATE TABLE public.passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category pass_category NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  duration INTEGER NOT NULL,
  sessions_included INTEGER NOT NULL,
  description TEXT NOT NULL,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  stripe_purchase_link TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_passes_active ON public.passes(is_active);
CREATE INDEX idx_passes_category ON public.passes(category);

-- Party packages table
CREATE TABLE public.party_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  capacity INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  included_items JSONB NOT NULL DEFAULT '[]',
  add_ons JSONB NOT NULL DEFAULT '[]',
  description TEXT NOT NULL,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  stripe_purchase_link TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_party_packages_active ON public.party_packages(is_active);

-- Products table (food, beverage, retail)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category product_category NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  allergens JSONB NOT NULL DEFAULT '[]',
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  stripe_purchase_link TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_available ON public.products(available);

-- Purchases table
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  type purchase_type NOT NULL,
  product_id UUID NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  first_use_date TIMESTAMP WITH TIME ZONE,
  actual_expiry_date TIMESTAMP WITH TIME ZONE,
  used_sessions INTEGER DEFAULT 0,
  total_sessions INTEGER NOT NULL,
  status purchase_status DEFAULT 'active',
  auto_renew BOOLEAN DEFAULT FALSE,
  next_renewal_date TIMESTAMP WITH TIME ZONE,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  party_date DATE,
  party_start_time TIME,
  party_end_time TIME,
  party_guests INTEGER,
  party_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_purchases_customer ON public.purchases(customer_id);
CREATE INDEX idx_purchases_status ON public.purchases(status);
CREATE INDEX idx_purchases_type ON public.purchases(type);
CREATE INDEX idx_purchases_payment_intent ON public.purchases(stripe_payment_intent_id);
CREATE INDEX idx_purchases_subscription ON public.purchases(stripe_subscription_id);

-- Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in minutes
  auto_checkout_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_customer ON public.sessions(customer_id);
CREATE INDEX idx_sessions_purchase ON public.sessions(purchase_id);
CREATE INDEX idx_sessions_active ON public.sessions(end_time) WHERE end_time IS NULL;

-- Promos table
CREATE TABLE public.promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  description TEXT NOT NULL,
  stripe_coupon_id TEXT,
  stripe_coupon_code TEXT NOT NULL,
  banner_style banner_style DEFAULT 'honeycomb',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_promos_active ON public.promos(is_active);
CREATE INDEX idx_promos_dates ON public.promos(start_date, end_date);

-- Volume discounts table
CREATE TABLE public.volume_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  product_type product_type NOT NULL,
  min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_volume_discounts_product ON public.volume_discounts(product_id, product_type);

-- Saved cards table
CREATE TABLE public.saved_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL,
  last4 TEXT NOT NULL,
  brand TEXT NOT NULL,
  expiry_month INTEGER NOT NULL CHECK (expiry_month >= 1 AND expiry_month <= 12),
  expiry_year INTEGER NOT NULL CHECK (expiry_year >= 2024),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_saved_cards_customer ON public.saved_cards(customer_id);
CREATE INDEX idx_saved_cards_default ON public.saved_cards(customer_id, is_default) WHERE is_default = TRUE;

-- ==================== TRIGGERS ====================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_passes_updated_at BEFORE UPDATE ON public.passes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_party_packages_updated_at BEFORE UPDATE ON public.party_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promos_updated_at BEFORE UPDATE ON public.promos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volume_discounts_updated_at BEFORE UPDATE ON public.volume_discounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_cards_updated_at BEFORE UPDATE ON public.saved_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

