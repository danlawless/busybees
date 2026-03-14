-- One-time: Create permanent complimentary day passes for Rachel McKillop's children
-- Camden and Duncan each get an unlimited, never-expiring day pass ($0).

DO $$
DECLARE
  v_customer_id UUID;
  v_product_id UUID;
  v_camden_id UUID;
  v_duncan_id UUID;
BEGIN
  -- Find customer by phone
  SELECT id INTO v_customer_id FROM users WHERE phone = '9788552679' LIMIT 1;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer with phone 9788552679 not found';
  END IF;

  -- Find a day pass to reference as product_id
  SELECT id INTO v_product_id FROM passes
    WHERE category = 'day' AND is_active = true
    LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'No active day pass found to reference';
  END IF;

  -- Find Camden
  SELECT id INTO v_camden_id FROM children
    WHERE customer_id = v_customer_id AND name ILIKE '%camden%'
    LIMIT 1;

  -- Find Duncan
  SELECT id INTO v_duncan_id FROM children
    WHERE customer_id = v_customer_id AND name ILIKE '%duncan%'
    LIMIT 1;

  -- Create unlimited pass for Camden
  IF v_camden_id IS NOT NULL THEN
    INSERT INTO purchases (
      customer_id, child_id, product_id, type, name, price, purchase_date,
      expiry_date, used_sessions, total_sessions, status
    ) VALUES (
      v_customer_id, v_camden_id, v_product_id, 'day_pass',
      'Complimentary Day Pass - Camden (VIP)',
      0, NOW(), NULL, 0, 999, 'active'
    );
    RAISE NOTICE 'Created complimentary pass for Camden';
  ELSE
    RAISE NOTICE 'Camden not found under this account';
  END IF;

  -- Create unlimited pass for Duncan
  IF v_duncan_id IS NOT NULL THEN
    INSERT INTO purchases (
      customer_id, child_id, product_id, type, name, price, purchase_date,
      expiry_date, used_sessions, total_sessions, status
    ) VALUES (
      v_customer_id, v_duncan_id, v_product_id, 'day_pass',
      'Complimentary Day Pass - Duncan (VIP)',
      0, NOW(), NULL, 0, 999, 'active'
    );
    RAISE NOTICE 'Created complimentary pass for Duncan';
  ELSE
    RAISE NOTICE 'Duncan not found under this account';
  END IF;
END $$;
