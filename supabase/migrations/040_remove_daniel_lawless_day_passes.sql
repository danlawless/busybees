-- One-time: Remove all day pass purchases for Daniel Lawless (9789876257)
-- These were stored with type 'monthly_pass' from early testing and are
-- incorrectly showing on the Monthly Pass Members page.
DELETE FROM purchases
WHERE customer_id = (
  SELECT id FROM users WHERE phone = '9789876257' LIMIT 1
)
AND name ILIKE '%day pass%';
