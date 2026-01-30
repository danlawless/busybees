-- Update staff PIN to 0297
UPDATE public.settings
SET value = '0297'
WHERE key = 'staff_pin';
