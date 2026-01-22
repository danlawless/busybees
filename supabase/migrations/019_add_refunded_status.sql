-- Migration: Add 'refunded' status to purchase_status ENUM
-- This allows proper tracking of refunded purchases separately from naturally expired ones

-- Add 'refunded' value to the purchase_status enum
ALTER TYPE purchase_status ADD VALUE IF NOT EXISTS 'refunded';

-- Add index for refunded status queries (optional but helps with filtering)
-- Note: The existing idx_purchases_status index will automatically include refunded status
