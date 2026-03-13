-- One-time: Expire all active monthly passes for Daniel Lawless (9789876257)
UPDATE purchases
SET status = 'expired',
    auto_renew = false,
    next_renewal_date = NULL,
    updated_at = NOW()
WHERE type = 'monthly_pass'
  AND status = 'active'
  AND customer_id = (
    SELECT id FROM users WHERE phone = '9789876257' LIMIT 1
  );
