-- Seed: Make Easter Egg Hunt a bookable event
-- Run AFTER migration 044_create_event_bookings.sql
--
-- Step 1: Find the Easter Egg Hunt pass IDs
-- SELECT id, name FROM passes WHERE name ILIKE '%Easter Egg%';
--
-- Step 2: Update the Easter Egg Hunt event with bookability
-- Replace the UUIDs below with actual pass IDs from Step 1

-- If the Easter Egg Hunt event already exists in the events table:
UPDATE events
SET is_bookable = true,
    max_capacity = 100,
    pass_ids = ARRAY[
      '<easter-child-pass-id>',   -- Replace with: Easter Egg Hunt - Child 2+ pass ID
      '<easter-infant-pass-id>'   -- Replace with: Easter Egg Hunt - Infant pass ID
    ]::UUID[],
    booking_instructions = 'Register your children for our Easter Egg Hunt on April 4th! Select your children below and we''ll match them to the right pass based on their age.'
WHERE title ILIKE '%Easter Egg%';

-- If no Easter Egg Hunt event exists yet, create one:
-- INSERT INTO events (title, description, image_url, event_date, event_time_start, event_time_end, status, is_bookable, max_capacity, pass_ids, booking_instructions)
-- VALUES (
--   'Easter Egg Hunt',
--   'Join us for our annual Easter Egg Hunt! Fun for all ages 0-6.',
--   'https://your-image-url-here',
--   '2026-04-04',
--   '15:00',
--   '17:00',
--   'published',
--   true,
--   100,
--   ARRAY['<easter-child-pass-id>', '<easter-infant-pass-id>']::UUID[],
--   'Register your children for our Easter Egg Hunt on April 4th!'
-- );
