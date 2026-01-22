-- ==================== RENAME PARTY STATUS: completed → done ====================
-- This migration clarifies the party booking status terminology:
-- - "completed" was confusing (sounds like "booking completed" vs "party occurred")
-- - "done" clearly indicates the party event has already happened

-- Rename the enum value from 'completed' to 'done'
ALTER TYPE booking_status RENAME VALUE 'completed' TO 'done';

-- Note: This automatically updates all existing rows that have status='completed'
-- to status='done' since they reference the enum type.
