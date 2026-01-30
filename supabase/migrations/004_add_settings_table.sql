-- ==================== SETTINGS TABLE ====================

-- Settings table for storing configuration (API keys, etc.)
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Only staff/admin can read settings
CREATE POLICY "Staff can view settings"
  ON public.settings FOR SELECT
  USING (is_staff_or_admin());

-- Only admin can create/update settings
CREATE POLICY "Admin can insert settings"
  ON public.settings FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update settings"
  ON public.settings FOR UPDATE
  USING (is_admin());

-- Create index
CREATE INDEX idx_settings_key ON public.settings(key);

-- Auto-update trigger
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO public.settings (key, value, description, is_encrypted) VALUES
  ('stripe_secret_key', '', 'Stripe secret API key (starts with sk_)', true),
  ('stripe_publishable_key', '', 'Stripe publishable API key (starts with pk_)', false),
  ('stripe_webhook_secret', '', 'Stripe webhook signing secret (starts with whsec_)', true),
  ('maintenance_mode', 'false', 'Enable maintenance mode to prevent customer access', false),
  ('closing_time', '20:00', 'Default closing time for auto-checkout (HH:MM)', false),
  ('staff_pin', '0297', 'Default staff PIN for quick access (change this!)', true)
ON CONFLICT (key) DO NOTHING;

