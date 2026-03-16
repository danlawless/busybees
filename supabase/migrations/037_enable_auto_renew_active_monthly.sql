-- One-time migration: Enable auto_renew for all currently active monthly passes.
-- This does NOT re-enable auto_renew if a customer later turns it off.
UPDATE purchases
SET auto_renew = true,
    next_renewal_date = COALESCE(next_renewal_date, expiry_date),
    updated_at = NOW()
WHERE type = 'monthly_pass'
  AND status = 'active'
  AND (auto_renew IS NULL OR auto_renew = false);
