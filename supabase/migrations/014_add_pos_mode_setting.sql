-- Add POS mode setting for kiosk vs staff-assisted mode
-- kiosk = self-serve (customers pay via Stripe Checkout)
-- staff = staff-assisted (staff processes payments)

INSERT INTO public.settings (key, value, description, is_encrypted)
VALUES ('pos_mode', 'kiosk', 'POS operation mode: kiosk (self-serve) or staff (staff-assisted)', false)
ON CONFLICT (key) DO UPDATE SET value = 'kiosk';

