-- Update staff PIN to 0297
-- The original migration (004) used ON CONFLICT DO NOTHING, so changing
-- the default value in that file had no effect on existing databases.
-- This migration explicitly updates the PIN for databases that still
-- have the old default value.

UPDATE public.settings
SET value = '0297', updated_at = NOW()
WHERE key = 'staff_pin' AND value = '1234';
