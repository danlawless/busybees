-- One-time: Create a permanent complimentary day pass for Rachel McKillop (9788552679)
-- Covers all children on her account via purchase_children table.

DO $$
DECLARE
  v_customer_id UUID;
  v_purchase_id UUID;
  v_child RECORD;
BEGIN
  -- Find customer by phone
  SELECT id INTO v_customer_id FROM users WHERE phone = '9788552679' LIMIT 1;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer with phone 9788552679 not found';
  END IF;

  -- Insert complimentary purchase: unlimited sessions (999), no expiry
  INSERT INTO purchases (
    customer_id, child_id, type, name, price, purchase_date,
    expiry_date, used_sessions, total_sessions, status
  ) VALUES (
    v_customer_id, NULL, 'day_pass',
    'Complimentary Day Pass - Family (VIP)',
    0, NOW(), NULL, 0, 999, 'active'
  )
  RETURNING id INTO v_purchase_id;

  -- Link all children on the account via purchase_children
  FOR v_child IN SELECT id FROM children WHERE customer_id = v_customer_id
  LOOP
    INSERT INTO purchase_children (purchase_id, child_id)
    VALUES (v_purchase_id, v_child.id);
  END LOOP;

  RAISE NOTICE 'Created complimentary pass % for customer %', v_purchase_id, v_customer_id;
END $$;
