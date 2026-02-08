-- Add gift_card_amount_used column to purchases table
-- Tracks how much gift card credit was applied to each purchase
ALTER TABLE purchases ADD COLUMN gift_card_amount_used NUMERIC(10,2) DEFAULT 0;
