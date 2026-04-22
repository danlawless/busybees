-- Add 'after_dark' value to purchase_type enum so After Dark bookings
-- can be recorded in the purchases table and show up in Revenue reports.
ALTER TYPE purchase_type ADD VALUE IF NOT EXISTS 'after_dark';
