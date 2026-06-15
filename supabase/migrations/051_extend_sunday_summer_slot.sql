-- ==================== EXTEND SUNDAY SUMMER SEMI-PRIVATE SLOT ====================
-- Migration 050 seeded the Sunday summer slot at 1:00 PM - 3:00 PM. Business
-- decision: align Sunday with Saturday at 1:00 PM - 4:00 PM (3-hour slot).

UPDATE public.party_time_slots
SET end_time = '16:00',
    label = '1:00 PM - 4:00 PM (Summer Hours)'
WHERE party_type = 'semi_private'
  AND day_type = 'weekend'
  AND day_of_week = 0
  AND start_time = '13:00'
  AND effective_start_date = '2026-06-29'
  AND effective_end_date = '2026-08-30';
