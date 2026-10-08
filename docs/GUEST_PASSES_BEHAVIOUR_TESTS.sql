-- Guest pass behaviour tests (runbook T1-T9, T12) against migration 057.
--
-- SAFE TO RUN ON PRODUCTION: everything happens inside one DO block that ends
-- by RAISING AN ERROR on purpose. An error rolls back every change the block
-- made -- test accounts, children, memberships, guest passes, sessions --
-- so nothing is ever saved. The error message IS the test report.
--
-- Expect: "ERROR: GUEST PASS TESTS: 13/13 passed. Nothing was saved ..."
-- Any other error also means nothing was saved; send it back to Claude.

DO $$
DECLARE
  n        int := 10;          -- 1=member M, 2=member M2 (expired), 3=member M3, 4..10 = friends
  uid      uuid[] := ARRAY[]::uuid[];
  cid      uuid[] := ARRAY[]::uuid[];
  i        int;
  tag      text := substr(md5(random()::text), 1, 6);
  monthly  uuid;
  mem_m    uuid;
  mem_m3   uuid;
  mem_new  uuid;
  pid1     uuid;
  pid2     uuid;
  res      jsonb;
  cnt      int;
  pr       numeric;
  st       text;
  gof      uuid;
  co       timestamptz := now() + interval '4 hours';
  report   text := '';
  passed   int := 0;
  total    int := 0;
  ok       boolean;
BEGIN
  SELECT id INTO monthly FROM public.passes WHERE category = 'monthly' ORDER BY created_at LIMIT 1;

  -- Throwaway families. Phones start 000 (never a real number), emails .invalid.
  FOR i IN 1..n LOOP
    uid[i] := gen_random_uuid();
    cid[i] := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (uid[i], '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            format('guestpass-test-%s-%s@example.invalid', tag, i), now(), now());
    INSERT INTO public.users (id, phone, name, email, role)
    VALUES (uid[i], '000' || lpad((abs(hashtext(tag)) % 10000)::text, 4, '0') || lpad(i::text, 3, '0'),
            'GUEST PASS TEST ' || i, format('guestpass-test-%s-%s@example.invalid', tag, i), 'customer')
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, name = EXCLUDED.name, role = 'customer';
    INSERT INTO public.children (id, customer_id, name, birthdate)
    VALUES (cid[i], uid[i], 'Test Child ' || tag || ' ' || i, DATE '2023-01-01');
  END LOOP;

  -- Memberships: M active, M2 expired, M3 active.
  INSERT INTO public.purchases (customer_id, type, product_id, name, price, purchase_date, expiry_date, total_sessions, status)
  VALUES (uid[1], 'monthly_pass', monthly, 'TEST membership', 65, now() - interval '1 day', now() + interval '29 days', 999, 'active')
  RETURNING id INTO mem_m;
  INSERT INTO public.purchases (customer_id, type, product_id, name, price, purchase_date, expiry_date, total_sessions, status)
  VALUES (uid[2], 'monthly_pass', monthly, 'TEST membership', 65, now() - interval '40 days', now() - interval '10 days', 999, 'expired');
  INSERT INTO public.purchases (customer_id, type, product_id, name, price, purchase_date, expiry_date, total_sessions, status)
  VALUES (uid[3], 'monthly_pass', monthly, 'TEST membership', 65, now() - interval '1 day', now() + interval '29 days', 999, 'active')
  RETURNING id INTO mem_m3;
  -- Friend 7 once bought something and was refunded: still a customer.
  INSERT INTO public.purchases (customer_id, child_id, type, product_id, name, price, total_sessions, status)
  VALUES (uid[7], cid[7], 'day_pass', monthly, 'TEST refunded day pass', 20, 1, 'refunded');

  -- T1: first guest pass works, is $0, used, linked to M's membership, child checked in.
  res := public.issue_guest_pass(uid[1], uid[4], cid[4], co, 2);
  pid1 := (res->>'purchase_id')::uuid;
  SELECT price, status::text, guest_of_purchase_id INTO pr, st, gof FROM public.purchases WHERE id = pid1;
  SELECT count(*) INTO cnt FROM public.sessions WHERE purchase_id = pid1 AND end_time IS NULL;
  ok := coalesce((res->>'ok')::boolean, false) AND (res->>'remaining')::int = 1
        AND pr = 0 AND st = 'used' AND gof = mem_m AND cnt = 1;
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T1  first guest pass issued ($0, used, linked, checked in)' || CASE WHEN ok THEN '' ELSE '  got ' || res::text END;

  -- T2: second works (0 left), third refused.
  res := public.issue_guest_pass(uid[1], uid[5], cid[5], co, 2);
  pid2 := (res->>'purchase_id')::uuid;
  ok := coalesce((res->>'ok')::boolean, false) AND (res->>'remaining')::int = 0;
  res := public.issue_guest_pass(uid[1], uid[6], cid[6], co, 2);
  ok := ok AND res->>'reason' = 'none_left';
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T2  second pass ok, third refused (none_left)' || CASE WHEN ok THEN '' ELSE '  got ' || res::text END;

  -- T3: expired membership gets nothing.
  res := public.issue_guest_pass(uid[2], uid[6], cid[6], co, 2);
  ok := res->>'reason' = 'no_membership';
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T3  expired membership refused (no_membership)' || CASE WHEN ok THEN '' ELSE '  got ' || res::text END;

  -- T4: friend with a refunded purchase is not new.
  res := public.issue_guest_pass(uid[3], uid[7], cid[7], co, 2);
  ok := res->>'reason' = 'not_new';
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T4  friend with a refunded purchase refused (not_new)' || CASE WHEN ok THEN '' ELSE '  got ' || res::text END;

  -- T5: a member cannot be their own guest.
  res := public.issue_guest_pass(uid[3], uid[3], cid[3], co, 2);
  ok := res->>'reason' = 'same_account';
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T5  member as own guest refused (same_account)' || CASE WHEN ok THEN '' ELSE '  got ' || res::text END;

  -- T5b: a child from another family cannot be checked in on this friend.
  res := public.issue_guest_pass(uid[3], uid[8], cid[4], co, 2);
  ok := res->>'reason' = 'child_not_found';
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T5b someone else''s child refused (child_not_found)' || CASE WHEN ok THEN '' ELSE '  got ' || res::text END;

  -- T6: a finished visit cannot be undone.
  UPDATE public.sessions SET end_time = now() WHERE purchase_id = pid1;
  res := public.void_guest_pass(pid1);
  SELECT count(*) INTO cnt FROM public.purchases WHERE id = pid1;
  ok := res->>'reason' = 'visit_ended' AND cnt = 1;
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T6  undo after the visit ended refused, pass kept' || CASE WHEN ok THEN '' ELSE '  got ' || res::text END;

  -- T7: undo an open visit: purchase + session gone, member gets the pass back.
  res := public.void_guest_pass(pid2);
  SELECT count(*) INTO cnt FROM public.purchases WHERE id = pid2;
  ok := coalesce((res->>'ok')::boolean, false) AND cnt = 0;
  SELECT count(*) INTO cnt FROM public.sessions WHERE purchase_id = pid2;
  ok := ok AND cnt = 0;
  SELECT count(*) INTO cnt FROM public.purchases WHERE guest_of_purchase_id = mem_m;
  ok := ok AND cnt = 1;
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T7  undo open visit removes it and returns the pass' || CASE WHEN ok THEN '' ELSE '  got ' || res::text END;

  -- T8: renewal that inserts a new membership row starts a fresh allowance.
  INSERT INTO public.purchases (customer_id, type, product_id, name, price, purchase_date, expiry_date, total_sessions, status)
  VALUES (uid[1], 'monthly_pass', monthly, 'TEST renewal', 65, clock_timestamp(), now() + interval '59 days', 999, 'active')
  RETURNING id INTO mem_new;
  res := public.issue_guest_pass(uid[1], uid[6], cid[6], co, 2);
  SELECT guest_of_purchase_id INTO gof FROM public.purchases WHERE id = (res->>'purchase_id')::uuid;
  ok := coalesce((res->>'ok')::boolean, false) AND (res->>'remaining')::int = 1 AND gof = mem_new;
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T8  new-row renewal counts against the new membership' || CASE WHEN ok THEN '' ELSE '  got ' || res::text END;

  -- T12: in-place renewal (legacy subscription style) resets the count.
  res := public.issue_guest_pass(uid[3], uid[8], cid[8], co, 2);
  ok := coalesce((res->>'ok')::boolean, false) AND (res->>'remaining')::int = 1;
  UPDATE public.purchases SET purchase_date = clock_timestamp() WHERE id = mem_m3;
  res := public.issue_guest_pass(uid[3], uid[9], cid[9], co, 2);
  ok := ok AND coalesce((res->>'ok')::boolean, false) AND (res->>'remaining')::int = 1;
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T12 in-place renewal resets the allowance' || CASE WHEN ok THEN '' ELSE '  got ' || res::text END;

  -- T9: browsers (anon / signed-in) cannot call the functions.
  ok := NOT has_function_privilege('anon', 'public.issue_guest_pass(uuid,uuid,uuid,timestamptz,integer)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.issue_guest_pass(uuid,uuid,uuid,timestamptz,integer)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.void_guest_pass(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.void_guest_pass(uuid)', 'EXECUTE');
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T9  anon/authenticated cannot run the functions';

  -- T13: the Guest Pass product is never for sale.
  SELECT count(*) INTO cnt FROM public.passes WHERE name = 'Guest Pass' AND price = 0 AND is_active = false;
  ok := cnt = 1;
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T13 Guest Pass product exists, $0, inactive';

  -- T14: nothing real was touched -- only our 10 test accounts own guest passes.
  SELECT count(*) INTO cnt FROM public.purchases
  WHERE guest_of_purchase_id IS NOT NULL AND NOT (customer_id = ANY (uid));
  ok := cnt = 0;
  total := total + 1; IF ok THEN passed := passed + 1; END IF;
  report := report || E'\n' || CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END
            || ' T14 no real customer has a guest pass';

  RAISE EXCEPTION USING MESSAGE = format(
    'GUEST PASS TESTS: %s/%s passed. Nothing was saved (this error rolls everything back).%s',
    passed, total, report);
END $$;
