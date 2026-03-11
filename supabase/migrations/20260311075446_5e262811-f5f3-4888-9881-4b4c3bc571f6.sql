
-- Secure function for single session booking with atomic credit deduction
CREATE OR REPLACE FUNCTION public.book_single_session(
  p_trainee_id uuid,
  p_class_slot_id uuid,
  p_trainee_package_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role app_role;
  v_slot class_slots%ROWTYPE;
  v_pkg trainee_packages%ROWTYPE;
  v_booking_count int;
  v_credit_cost numeric;
  v_slot_time text;
  v_new_credits numeric;
BEGIN
  -- 1. Authorization: caller must be the trainee, an admin, or a trainer owning the class
  SELECT role INTO v_caller_role FROM user_roles WHERE user_id = v_caller_id LIMIT 1;
  
  IF v_caller_id = p_trainee_id THEN
    -- trainee booking for themselves, OK
    NULL;
  ELSIF v_caller_role = 'admin' THEN
    NULL;
  ELSIF v_caller_role = 'trainer' THEN
    -- trainer must own the class slot
    IF NOT EXISTS (
      SELECT 1 FROM class_slots cs JOIN trainers t ON cs.trainer_id = t.id
      WHERE cs.id = p_class_slot_id AND t.user_id = v_caller_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not authorized to book this class');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- 2. Validate class slot exists
  SELECT * INTO v_slot FROM class_slots WHERE id = p_class_slot_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Class slot not found');
  END IF;

  -- 3. Check capacity
  SELECT COUNT(*)::int INTO v_booking_count FROM bookings WHERE class_slot_id = p_class_slot_id AND status = 'confirmed';
  IF v_booking_count >= v_slot.capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'class_full');
  END IF;

  -- 4. Check duplicate
  IF EXISTS (SELECT 1 FROM bookings WHERE trainee_id = p_trainee_id AND class_slot_id = p_class_slot_id AND status = 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_booked');
  END IF;

  -- 5. Validate package belongs to trainee and is active
  SELECT * INTO v_pkg FROM trainee_packages WHERE id = p_trainee_package_id AND trainee_id = p_trainee_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active package found');
  END IF;

  -- 6. Calculate credit cost from time_pricing
  v_slot_time := to_char(v_slot.start_time AT TIME ZONE 'UTC', 'HH24:MI');
  SELECT tp.credit_cost INTO v_credit_cost
  FROM time_pricing tp
  WHERE v_slot_time >= to_char(tp.start_time, 'HH24:MI') AND v_slot_time < to_char(tp.end_time, 'HH24:MI')
  LIMIT 1;
  IF v_credit_cost IS NULL THEN v_credit_cost := 1; END IF;

  -- 7. Check sufficient credits
  IF v_pkg.remaining_credits < v_credit_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits');
  END IF;

  -- 8. Insert booking
  INSERT INTO bookings (trainee_id, class_slot_id, trainee_package_id)
  VALUES (p_trainee_id, p_class_slot_id, p_trainee_package_id);

  -- 9. Deduct credits
  v_new_credits := round((v_pkg.remaining_credits - v_credit_cost)::numeric, 1);
  UPDATE trainee_packages SET remaining_credits = v_new_credits WHERE id = p_trainee_package_id;

  RETURN jsonb_build_object('success', true, 'credits_deducted', v_credit_cost, 'remaining_credits', v_new_credits);
END;
$$;

-- Secure function for recurring session booking with atomic credit deduction
CREATE OR REPLACE FUNCTION public.book_recurring_sessions(
  p_trainee_id uuid,
  p_class_slot_id uuid,
  p_trainee_package_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role app_role;
  v_seed_slot class_slots%ROWTYPE;
  v_pkg trainee_packages%ROWTYPE;
  v_credits_left numeric;
  v_target_day int;
  v_target_time time;
  v_slot RECORD;
  v_slot_time text;
  v_slot_cost numeric;
  v_booking_count int;
  v_booked int := 0;
BEGIN
  -- 1. Authorization
  SELECT role INTO v_caller_role FROM user_roles WHERE user_id = v_caller_id LIMIT 1;
  
  IF v_caller_id != p_trainee_id AND v_caller_role != 'admin' THEN
    IF v_caller_role = 'trainer' THEN
      IF NOT EXISTS (
        SELECT 1 FROM class_slots cs JOIN trainers t ON cs.trainer_id = t.id
        WHERE cs.id = p_class_slot_id AND t.user_id = v_caller_id
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
      END IF;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
    END IF;
  END IF;

  -- 2. Get seed slot
  SELECT * INTO v_seed_slot FROM class_slots WHERE id = p_class_slot_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Class slot not found');
  END IF;

  -- 3. Validate package
  SELECT * INTO v_pkg FROM trainee_packages WHERE id = p_trainee_package_id AND trainee_id = p_trainee_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active package found');
  END IF;

  v_credits_left := v_pkg.remaining_credits;
  v_target_day := EXTRACT(DOW FROM v_seed_slot.start_time);
  v_target_time := v_seed_slot.start_time::time;

  -- 4. Loop through matching future slots
  FOR v_slot IN
    SELECT cs.id, cs.start_time, cs.capacity
    FROM class_slots cs
    WHERE cs.start_time >= now()
      AND EXTRACT(DOW FROM cs.start_time) = v_target_day
      AND cs.start_time::time = v_target_time
    ORDER BY cs.start_time ASC
  LOOP
    -- Check capacity
    SELECT COUNT(*)::int INTO v_booking_count FROM bookings WHERE class_slot_id = v_slot.id AND status = 'confirmed';
    IF v_booking_count >= v_slot.capacity THEN CONTINUE; END IF;

    -- Skip if already booked
    IF EXISTS (SELECT 1 FROM bookings WHERE trainee_id = p_trainee_id AND class_slot_id = v_slot.id AND status = 'confirmed') THEN CONTINUE; END IF;

    -- Calculate cost
    v_slot_time := to_char(v_slot.start_time AT TIME ZONE 'UTC', 'HH24:MI');
    SELECT tp.credit_cost INTO v_slot_cost
    FROM time_pricing tp
    WHERE v_slot_time >= to_char(tp.start_time, 'HH24:MI') AND v_slot_time < to_char(tp.end_time, 'HH24:MI')
    LIMIT 1;
    IF v_slot_cost IS NULL THEN v_slot_cost := 1; END IF;

    -- Check credits
    IF v_credits_left < v_slot_cost THEN EXIT; END IF;

    -- Book it
    INSERT INTO bookings (trainee_id, class_slot_id, trainee_package_id, is_recurring)
    VALUES (p_trainee_id, v_slot.id, p_trainee_package_id, true);

    v_credits_left := round((v_credits_left - v_slot_cost)::numeric, 1);
    v_booked := v_booked + 1;
  END LOOP;

  IF v_booked = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_matching_slots');
  END IF;

  -- Update credits once
  UPDATE trainee_packages SET remaining_credits = v_credits_left WHERE id = p_trainee_package_id;

  RETURN jsonb_build_object('success', true, 'sessions_booked', v_booked, 'remaining_credits', v_credits_left);
END;
$$;
