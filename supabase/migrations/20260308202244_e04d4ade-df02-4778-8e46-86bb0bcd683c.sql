
-- Fix 1: Remove trainee self-update on trainee_packages (credit inflation)
DROP POLICY IF EXISTS "Trainees can update own package credits" ON public.trainee_packages;

-- Fix 2: Fix voucher_codes exposure - replace broad trainee SELECT with own-redeemed-only
DROP POLICY IF EXISTS "Trainees can read voucher codes" ON public.voucher_codes;
CREATE POLICY "Trainees can read own redeemed vouchers"
ON public.voucher_codes FOR SELECT TO authenticated
USING (redeemed_by = auth.uid());

-- Fix 3: Replace redeem_voucher to use auth.uid() instead of caller-supplied _user_id
CREATE OR REPLACE FUNCTION public.redeem_voucher(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_voucher voucher_codes%ROWTYPE;
  v_promotion promotions%ROWTYPE;
  v_pkg trainee_packages%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_voucher FROM voucher_codes WHERE code = _code AND redeemed_by IS NULL AND expires_at > now();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired voucher code');
  END IF;

  SELECT * INTO v_promotion FROM promotions WHERE id = v_voucher.promotion_id AND is_active = true AND type = 'voucher';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promotion not active');
  END IF;

  IF v_promotion.end_date IS NOT NULL AND v_promotion.end_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promotion has expired');
  END IF;

  SELECT * INTO v_pkg FROM trainee_packages WHERE trainee_id = v_user_id AND is_active = true ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active package');
  END IF;

  UPDATE voucher_codes SET redeemed_by = v_user_id, redeemed_at = now() WHERE id = v_voucher.id;
  UPDATE trainee_packages SET remaining_credits = remaining_credits + v_promotion.credit_amount WHERE id = v_pkg.id;
  INSERT INTO promotion_redemptions (promotion_id, user_id, credits_awarded, metadata)
  VALUES (v_promotion.id, v_user_id, v_promotion.credit_amount, jsonb_build_object('voucher_code', _code));

  RETURN jsonb_build_object('success', true, 'credits', v_promotion.credit_amount);
END;
$$;
