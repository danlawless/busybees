-- ==================== BUSINESS LOGIC FUNCTIONS ====================

-- Function to auto-expire passes based on date
CREATE OR REPLACE FUNCTION auto_expire_passes()
RETURNS void AS $$
BEGIN
  UPDATE public.purchases
  SET status = 'expired'
  WHERE status = 'active'
    AND expiry_date IS NOT NULL
    AND expiry_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate actual expiry date from first use
CREATE OR REPLACE FUNCTION calculate_actual_expiry()
RETURNS TRIGGER AS $$
DECLARE
  pass_duration INTEGER;
  pass_category pass_category;
BEGIN
  -- Only calculate for passes, not other purchase types
  IF NEW.type IN ('day_pass', 'weekly_pass', 'monthly_pass') AND NEW.first_use_date IS NOT NULL AND OLD.first_use_date IS NULL THEN
    -- Get the pass duration
    SELECT p.duration, p.category INTO pass_duration, pass_category
    FROM public.passes p
    WHERE p.id = NEW.product_id;

    -- Calculate actual expiry based on category
    IF pass_category = 'day' THEN
      -- Day pass expires at end of day
      NEW.actual_expiry_date = DATE_TRUNC('day', NEW.first_use_date) + INTERVAL '1 day' - INTERVAL '1 second';
    ELSIF pass_category = 'weekly' THEN
      -- Weekly pass expires after X days from first use
      NEW.actual_expiry_date = NEW.first_use_date + (pass_duration || ' days')::INTERVAL;
    ELSIF pass_category = 'monthly' THEN
      -- Monthly pass expires after 30 days from first use
      NEW.actual_expiry_date = NEW.first_use_date + (pass_duration || ' days')::INTERVAL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_purchase_expiry BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION calculate_actual_expiry();

-- Function to auto-checkout sessions after closing time
CREATE OR REPLACE FUNCTION auto_checkout_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.sessions
  SET
    end_time = auto_checkout_time,
    duration = EXTRACT(EPOCH FROM (auto_checkout_time - start_time)) / 60
  WHERE end_time IS NULL
    AND auto_checkout_time < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update purchase session counts when a session ends
CREATE OR REPLACE FUNCTION update_purchase_session_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when a session is ending (end_time is being set)
  IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL THEN
    UPDATE public.purchases
    SET
      used_sessions = used_sessions + 1,
      status = CASE
        WHEN used_sessions + 1 >= total_sessions THEN 'used'::purchase_status
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = NEW.purchase_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_sessions AFTER UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION update_purchase_session_count();

-- Function to set first use date when creating a session
CREATE OR REPLACE FUNCTION set_first_use_date()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.purchases
  SET first_use_date = COALESCE(first_use_date, NEW.start_time)
  WHERE id = NEW.purchase_id AND first_use_date IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_purchase_first_use AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION set_first_use_date();

-- Function to ensure only one default card per customer
CREATE OR REPLACE FUNCTION ensure_single_default_card()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.saved_cards
    SET is_default = FALSE
    WHERE customer_id = NEW.customer_id AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_default_card BEFORE INSERT OR UPDATE ON public.saved_cards
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_card();

-- Function to get active sessions for a customer
CREATE OR REPLACE FUNCTION get_active_sessions(customer_uuid UUID)
RETURNS TABLE (
  id UUID,
  purchase_id UUID,
  purchase_name TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  auto_checkout_time TIMESTAMP WITH TIME ZONE,
  child_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.purchase_id,
    p.name AS purchase_name,
    s.start_time,
    s.auto_checkout_time,
    c.name AS child_name
  FROM public.sessions s
  JOIN public.purchases p ON s.purchase_id = p.id
  LEFT JOIN public.children c ON p.child_id = c.id
  WHERE s.customer_id = customer_uuid
    AND s.end_time IS NULL
  ORDER BY s.start_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customer dashboard data
CREATE OR REPLACE FUNCTION get_customer_dashboard(customer_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'customer', (
      SELECT json_build_object(
        'id', u.id,
        'name', u.name,
        'email', u.email,
        'phone', u.phone
      )
      FROM public.users u
      WHERE u.id = customer_uuid
    ),
    'children', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', c.id,
          'name', c.name,
          'birthdate', c.birthdate,
          'waiver_signed', c.waiver_signed
        )
      ), '[]'::json)
      FROM public.children c
      WHERE c.customer_id = customer_uuid
    ),
    'active_purchases', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', p.id,
          'type', p.type,
          'name', p.name,
          'price', p.price,
          'used_sessions', p.used_sessions,
          'total_sessions', p.total_sessions,
          'expiry_date', p.expiry_date,
          'actual_expiry_date', p.actual_expiry_date,
          'party_date', p.party_date
        )
      ), '[]'::json)
      FROM public.purchases p
      WHERE p.customer_id = customer_uuid
        AND p.status = 'active'
    ),
    'active_sessions', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', s.id,
          'purchase_id', s.purchase_id,
          'start_time', s.start_time,
          'auto_checkout_time', s.auto_checkout_time
        )
      ), '[]'::json)
      FROM public.sessions s
      WHERE s.customer_id = customer_uuid
        AND s.end_time IS NULL
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Scheduled job to run maintenance tasks (call via pg_cron or external scheduler)
CREATE OR REPLACE FUNCTION run_maintenance_tasks()
RETURNS void AS $$
BEGIN
  PERFORM auto_expire_passes();
  PERFORM auto_checkout_sessions();
END;
$$ LANGUAGE plpgsql;

