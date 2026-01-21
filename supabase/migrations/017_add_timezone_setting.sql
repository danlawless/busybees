-- Add timezone setting for auto-checkout
-- This allows configuring which timezone the closing time applies to

INSERT INTO public.settings (key, value, description, is_encrypted) VALUES
  ('timezone', 'America/New_York', 'Timezone for auto-checkout closing time (IANA format)', false)
ON CONFLICT (key) DO NOTHING;
